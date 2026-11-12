package kr.matdagong.place.record;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static kr.matdagong.place.record.PlaceRecordModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.catalog.PlaceQueryService;
import kr.matdagong.place.catalog.PlaceViewLoader;
import kr.matdagong.place.draft.QuickDraftModels.QuickPlaceDraftRequest;
import kr.matdagong.place.draft.QuickDraftService;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import kr.matdagong.place.like.PlaceLikeService;
import kr.matdagong.place.location.DeviceLocation;
import kr.matdagong.place.location.NearbyPlaceGuard;
import kr.matdagong.place.media.MediaUrlSigner;
import kr.matdagong.place.media.PlacePhotoService;
import kr.matdagong.place.profile.CommunityProfileClient.AuthorProfile;
import kr.matdagong.place.profile.TestHiddenTasters;
import kr.matdagong.place.visit.PlaceVisitService;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/**
 * 다녀온 근거(빠른 저장·새 맛집 기록)는 기기 위치가 가게 1km 안일 때만 남기고, 이미 다녀온 가게(빠른 저장·내 기록·지운 기록)는
 * 위치 없이 기록하는지 실제 스키마로 확인합니다.
 */
class PlaceVisitDistanceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final String PNG =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    private static final UUID FIRST = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SECOND = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final AuthorProfile AUTHOR = new AuthorProfile("첫맛객", false);
    private static final String DRAFT_TOO_FAR = "현재 위치 1km 안의 장소만 저장할 수 있어요.";
    private static final String RECORD_TOO_FAR = "현재 위치에서 1km 안에 있는 장소만 등록할 수 있어요.";
    /** 가게(을지로)와 약 70m 떨어진 기기 위치입니다. */
    private static final DeviceLocation NEAR = new DeviceLocation(37.5665, 126.9915);
    /** 가게에서 약 7km 떨어진 기기 위치입니다. */
    private static final DeviceLocation FAR = new DeviceLocation(37.5, 127.0);

    private QuickDraftService drafts;
    private PlaceRecordService records;
    private PlaceVisitService visits;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_place_likes, user_place_dislikes, user_place_visits, place_quick_drafts");
        MediaUrlSigner signer = new MediaUrlSigner("integration-key", Duration.ofHours(6));
        PlaceViewLoader loader = new PlaceViewLoader(jdbc, signer, TestHiddenTasters.none());
        PlaceQueryService places = new PlaceQueryService(jdbc, loader, TestHiddenTasters.none());
        NearbyPlaceGuard nearby = new NearbyPlaceGuard(jdbc);
        visits = new PlaceVisitService(jdbc);
        drafts = new QuickDraftService(jdbc, nearby, visits);
        records = new PlaceRecordService(
                jdbc,
                places,
                loader,
                new PlaceRecordContentWriter(jdbc, new PlacePhotoService(jdbc, TestHiddenTasters.none())),
                drafts,
                new PlaceLikeService(jdbc, nearby),
                nearby,
                visits);
    }

    @Test
    void 빠른_저장은_기기가_가게_1km_안일_때만_된다() {
        assertStatus(() -> saveDraft("1001", FAR), HttpStatus.BAD_REQUEST, DRAFT_TOO_FAR);

        saveDraft("1001", NEAR);

        assertThat(drafts.findDrafts(FIRST)).singleElement().satisfies(draft -> assertThat(draft.providerPlaceId())
                .isEqualTo("1001"));
    }

    @Test
    void 빠른_저장은_요청_좌표가_아니라_카카오로_확인한_좌표로_거리를_재고_저장한다() {
        // 요청 본문의 가게 좌표를 기기 위치와 같게 꾸며도, 카카오가 알려 준 실제 가게가 멀면 저장하지 않습니다.
        QuickPlaceDraftRequest spoofed = draftRequest("1001", FAR.latitude(), FAR.longitude(), FAR);
        assertStatus(
                () -> drafts.saveDraft(FIRST, place(37.566, 126.991, true), spoofed),
                HttpStatus.BAD_REQUEST,
                DRAFT_TOO_FAR);

        QuickPlaceDraftRequest near = draftRequest("1001", 37.0, 127.0, NEAR);
        drafts.saveDraft(FIRST, place(37.566, 126.991, true), near);

        assertThat(drafts.findDrafts(FIRST)).singleElement().satisfies(draft -> {
            assertThat(draft.latitude()).isEqualTo(37.566);
            assertThat(draft.longitude()).isEqualTo(126.991);
        });
    }

    @Test
    void 새_기록은_기기_위치가_없거나_1km보다_멀면_거부하고_가까우면_저장한다() {
        assertStatus(() -> createRecord("1001", FAR), HttpStatus.BAD_REQUEST, RECORD_TOO_FAR);
        assertStatus(() -> createRecord("1001", null), HttpStatus.BAD_REQUEST, NearbyPlaceGuard.LOCATION_REQUIRED);

        createRecord("1001", NEAR);

        assertThat(records.findMine(FIRST)).hasSize(1);
    }

    @Test
    void 카카오로_확인하지_못하면_이미_등록된_가게는_저장된_좌표로_거리를_잰다() {
        records.createRecord(SECOND, AUTHOR, place(37.566, 126.991, false), recordRequest("1001", NEAR));

        // 확인하지 못한 요청 좌표(기기 옆)는 믿지 않고, 이미 등록된 가게 좌표(약 7km 밖)로 판단합니다.
        CreatePlaceRecordRequest spoofed = recordRequest("1001", FAR.latitude(), FAR.longitude(), FAR);
        assertStatus(
                () -> records.createRecord(FIRST, AUTHOR, place(FAR.latitude(), FAR.longitude(), false), spoofed),
                HttpStatus.BAD_REQUEST,
                RECORD_TOO_FAR);
    }

    @Test
    void 내_기록_수정과_빠른_저장에서_이어_쓰는_기록은_위치_없이_저장한다() {
        createRecord("1001", NEAR);
        createRecord("1001", null);

        saveDraft("2002", NEAR);
        createRecord("2002", null);

        assertThat(records.findMine(FIRST)).hasSize(2);
        assertThat(drafts.findDrafts(FIRST)).isEmpty();
    }

    @Test
    void 가_보고_싶은_하트만으로는_위치_없이_새_기록을_만들_수_없다() {
        PlaceView wished =
                records.createRecord(SECOND, AUTHOR, place(37.566, 126.991, false), recordRequest("2002", NEAR));
        like(wished.id());

        assertStatus(
                () -> records.createRecord(FIRST, AUTHOR, place(37.566, 126.991, false), recordRequest("2002", null)),
                HttpStatus.BAD_REQUEST,
                NearbyPlaceGuard.LOCATION_REQUIRED);
    }

    @Test
    void 빠른_저장한_곳은_다녀온_곳이_되고_빠른_저장을_지우면_빠진다() {
        saveDraft("1001", NEAR);
        assertThat(visits.visitedPlaceIds(FIRST)).hasSize(1);

        drafts.discardDraft(FIRST, "KAKAO", "1001");

        assertThat(visits.visitedPlaceIds(FIRST)).isEmpty();
    }

    @Test
    void 기록한_곳은_기록을_지워도_다녀온_곳으로_남고_위치_없이_다시_기록할_수_있다() {
        saveDraft("1001", NEAR);
        createRecord("1001", null);
        String placeId = records.findMine(FIRST).getFirst().id();

        records.deleteRecord(FIRST, placeId);

        assertThat(visits.visitedPlaceIds(FIRST)).containsExactly(placeId);
        createRecord("1001", FAR);
        assertThat(records.findMine(FIRST)).hasSize(1);
    }

    @Test
    void 다녀온_곳이_아닌_가게의_새_기록은_여전히_위치를_확인한다() {
        saveDraft("1001", NEAR);

        assertStatus(() -> createRecord("2002", FAR), HttpStatus.BAD_REQUEST, RECORD_TOO_FAR);
    }

    private void saveDraft(String providerPlaceId, DeviceLocation device) {
        QuickPlaceDraftRequest request = draftRequest(providerPlaceId, 37.566, 126.991, device);
        drafts.saveDraft(FIRST, request.submittedPlace(), request);
    }

    private void createRecord(String providerPlaceId, DeviceLocation device) {
        records.createRecord(FIRST, AUTHOR, place(37.566, 126.991, false), recordRequest(providerPlaceId, device));
    }

    private static void like(String placeId) {
        jdbc.update("INSERT INTO user_place_likes (account_id, place_id) VALUES (?, ?::uuid)", FIRST, placeId);
    }

    private static PlaceInfo place(double latitude, double longitude, boolean verified) {
        return new PlaceInfo("국밥집", "서울 중구 을지로 1", latitude, longitude, null, null, null, null, verified);
    }

    private static QuickPlaceDraftRequest draftRequest(
            String providerPlaceId, double latitude, double longitude, DeviceLocation device) {
        return new QuickPlaceDraftRequest(
                "KAKAO",
                providerPlaceId,
                "국밥집",
                "한식",
                "서울 중구 을지로 1",
                latitude,
                longitude,
                null,
                null,
                null,
                null,
                device);
    }

    private static CreatePlaceRecordRequest recordRequest(String providerPlaceId, DeviceLocation device) {
        return recordRequest(providerPlaceId, 37.566, 126.991, device);
    }

    private static CreatePlaceRecordRequest recordRequest(
            String providerPlaceId, double latitude, double longitude, DeviceLocation device) {
        return new CreatePlaceRecordRequest(
                "KAKAO",
                providerPlaceId,
                "국밥집",
                "한식",
                "서울 중구 을지로 1",
                latitude,
                longitude,
                null,
                null,
                null,
                null,
                "국물이 진하고 맛있어요.",
                RecordVisibility.PUBLIC,
                List.of(),
                List.of(),
                Map.of(),
                List.of(),
                List.of(PNG),
                device);
    }

    private static void assertStatus(ThrowingCallable call, HttpStatus status, String detail) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
            assertThat(exception.getStatusCode()).isEqualTo(status);
            assertThat(exception.getReason()).isEqualTo(detail);
        });
    }
}
