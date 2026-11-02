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
import kr.matdagong.place.catalog.SamplePlaceCatalog;
import kr.matdagong.place.draft.QuickDraftModels.QuickPlaceDraftRequest;
import kr.matdagong.place.draft.QuickDraftService;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import kr.matdagong.place.like.PlaceLikeService;
import kr.matdagong.place.media.MediaUrlSigner;
import kr.matdagong.place.media.PlacePhotoService;
import kr.matdagong.place.profile.CommunityProfileClient.AuthorProfile;
import kr.matdagong.place.recent.RecentPlaceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 실제 PostgreSQL에 Flyway 스키마를 적용하고 장소 기록 저장·조회와 하트·최근 본 장소 SQL을 검증합니다. */
class PlaceRecordServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final String PNG =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    private static final UUID FIRST = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SECOND = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final AuthorProfile FIRST_AUTHOR = new AuthorProfile("첫맛객", 3);
    private static final AuthorProfile SECOND_AUTHOR = new AuthorProfile("둘맛객", 5);

    private PlaceQueryService places;
    private PlaceLikeService likes;
    private QuickDraftService drafts;
    private RecentPlaceService recentPlaces;
    private PlaceRecordService service;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_place_likes, user_recent_places, place_quick_drafts");
        MediaUrlSigner signer = new MediaUrlSigner("integration-key", Duration.ofHours(6));
        SamplePlaceCatalog samples = new SamplePlaceCatalog();
        PlaceViewLoader loader = new PlaceViewLoader(jdbc, signer);
        places = new PlaceQueryService(jdbc, samples, loader);
        likes = new PlaceLikeService(jdbc);
        drafts = new QuickDraftService(jdbc);
        recentPlaces = new RecentPlaceService(jdbc, samples, loader, places);
        service = new PlaceRecordService(jdbc, places, loader, new PlacePhotoService(jdbc), drafts, likes);
    }

    @Test
    void 비공개_기록_사진은_base64가_아닌_서명_주소로_내려가고_다른_사람에게는_보이지_않는다() {
        PlaceView created = service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PRIVATE, List.of(new MenuInput("국밥", 9000, PNG)), List.of(PNG)));

        TasterRecordView mine = service.findMine(FIRST).get(0).tasters().get(0);
        assertThat(mine.tasterName()).isEqualTo("첫맛객");
        assertThat(mine.visibility()).isEqualTo(RecordVisibility.PRIVATE);
        assertThat(mine.photos())
                .singleElement()
                .asString()
                .startsWith("/media/place-record-photos/")
                .contains("?exp=")
                .contains("&sig=");
        assertThat(mine.menus().get(0).photo())
                .startsWith("/media/place-menu-photos/")
                .contains("?exp=");

        assertThat(places.findAll(null, SECOND)).noneMatch(place -> place.id().equals(created.id()));
        assertThat(places.findById(created.id(), SECOND).orElseThrow().tasters())
                .isEmpty();
    }

    @Test
    void 사진_있는_메뉴_앞에_새_메뉴를_넣어_수정해도_순번이_충돌하지_않는다() {
        service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PRIVATE, List.of(new MenuInput("국밥", 9000, PNG)), List.of(PNG)));
        TasterRecordView before = service.findMine(FIRST).get(0).tasters().get(0);

        // 화면은 기존 사진을 서명 주소 그대로 다시 보냅니다.
        service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request(
                        "국밥집",
                        RecordVisibility.PUBLIC,
                        List.of(
                                new MenuInput("만두", 6000, null),
                                new MenuInput("국밥", 9500, before.menus().get(0).photo())),
                        before.photos()));

        TasterRecordView after = service.findMine(FIRST).get(0).tasters().get(0);
        assertThat(after.menus()).extracting(MenuView::name).containsExactly("만두", "국밥");
        assertThat(after.menus().get(1).photo()).matches("^/media/place-menu-photos/[0-9a-f-]{36}$");
        assertThat(after.photos()).singleElement().asString().matches("^/media/place-record-photos/[0-9a-f-]{36}$");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM restaurant_record_photos", Integer.class))
                .isEqualTo(1);
    }

    @Test
    void 같은_가게를_여러_맛객이_등록하면_기록은_각자_쌓이고_가게_정보는_카카오_확인_값으로만_바뀐다() {
        PlaceView created = service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG)));

        service.createRecord(
                SECOND,
                SECOND_AUTHOR,
                unverified("폐업"),
                request("폐업", RecordVisibility.PUBLIC, List.of(), List.of(PNG)));
        PlaceView afterUnverified = places.findById(created.id(), SECOND).orElseThrow();
        assertThat(afterUnverified.name()).isEqualTo("국밥집");
        assertThat(afterUnverified.recordCount()).isEqualTo(2);
        assertThat(afterUnverified.tasters())
                .extracting(TasterRecordView::tasterName)
                .containsExactlyInAnyOrder("첫맛객", "둘맛객");

        service.createRecord(
                SECOND,
                SECOND_AUTHOR,
                verified("국밥집 본점"),
                request("국밥집 본점", RecordVisibility.PUBLIC, List.of(), List.of(PNG)));
        PlaceView afterVerified = places.findAll(null, FIRST).stream()
                .filter(place -> place.id().equals(created.id()))
                .findFirst()
                .orElseThrow();
        assertThat(afterVerified.name()).isEqualTo("국밥집 본점");
        assertThat(afterVerified.recordCount()).isEqualTo(2);
        assertThat(afterVerified.tasters())
                .allSatisfy(taster -> assertThat(taster.placeCount()).isEqualTo(1));
    }

    @Test
    void 최근_본_장소는_샘플과_DB_장소를_본_순서대로_함께_돌려준다() {
        PlaceView created = service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG)));
        String sampleId = new SamplePlaceCatalog().findAll(null).get(0).id();

        recentPlaces.remember(SECOND, created.id());
        jdbc.update("UPDATE user_recent_places SET viewed_at = now() - INTERVAL '1 minute'");
        recentPlaces.remember(SECOND, sampleId);

        assertThat(recentPlaces.findRecent(SECOND)).extracting(PlaceView::id).containsExactly(sampleId, created.id());
    }

    @Test
    void 기록을_저장하면_빠른_기록에서_빠지고_하트와_기록은_서로_바꿀_수_있다() {
        drafts.saveDraft(
                FIRST,
                new QuickPlaceDraftRequest(
                        "KAKAO", "1001", "국밥집", "한식", "서울 중구 을지로 1", 37.566, 126.991, null, null, null, null));
        PlaceView created = service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG)));
        assertThat(drafts.findDrafts(FIRST)).isEmpty();

        service.convertRecordToLike(FIRST, created.id());
        assertThat(service.findMine(FIRST)).isEmpty();
        assertThat(likes.visitedLikedPlaceIds(FIRST)).containsExactly(created.id());

        service.convertLikeToRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                created.id(),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG)),
                true);
        assertThat(likes.likedPlaceIds(FIRST)).isEmpty();
        assertThat(service.findMine(FIRST)).hasSize(1);
        assertThatThrownBy(() -> likes.setLiked(FIRST, created.id(), true))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).isEqualTo("내가 등록한 맛집은 내 맛집으로 중복 저장할 수 없습니다.");
                });
    }

    @Test
    void 이미지가_아닌_데이터는_사진으로_저장하지_않는다() {
        String notImage = "data:image/png;base64,AAAA";

        assertThatThrownBy(() -> service.createRecord(
                        FIRST,
                        FIRST_AUTHOR,
                        unverified("국밥집"),
                        request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(notImage))))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(exception.getReason()).isEqualTo("등록할 사진 형식을 확인해 주세요.");
                });
        assertThat(jdbc.queryForObject("SELECT count(*) FROM restaurant_places", Integer.class))
                .isZero();
    }

    private static PlaceInfo unverified(String name) {
        return new PlaceInfo(name, "서울 중구 을지로 1", 37.566, 126.991, null, null, "서울 중구 을지로 1", null, false);
    }

    private static PlaceInfo verified(String name) {
        return new PlaceInfo(
                name,
                "서울 중구 을지로 2",
                37.567,
                126.992,
                "02-000-0000",
                "http://place.map.kakao.com/1001",
                "서울 중구 을지로 2",
                null,
                true);
    }

    private static CreatePlaceRecordRequest request(
            String name, RecordVisibility visibility, List<MenuInput> menus, List<String> photos) {
        return new CreatePlaceRecordRequest(
                "KAKAO",
                "1001",
                name,
                "한식",
                "서울 중구 을지로 1",
                37.566,
                126.991,
                null,
                null,
                "서울 중구 을지로 1",
                null,
                "국물이 진하고 맛있어요.",
                visibility,
                menus,
                List.of("국물"),
                Map.of("국물", "TASTE"),
                List.of("혼밥"),
                photos);
    }
}
