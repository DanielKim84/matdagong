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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 실제 PostgreSQL에 Flyway 스키마를 적용하고 장소 기록 저장·조회와 하트·빠른 기록 연동 SQL을 검증합니다. */
class PlaceRecordServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final String PNG =
            "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    private static final UUID FIRST = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SECOND = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final AuthorProfile FIRST_AUTHOR = new AuthorProfile("첫맛객", false);
    private static final AuthorProfile SECOND_AUTHOR = new AuthorProfile("둘맛객", false);
    /** 아래 테스트 가게(을지로 1) 바로 앞의 기기 위치입니다. 거리 규칙은 PlaceVisitDistanceIntegrationTest가 확인합니다. */
    private static final DeviceLocation NEAR = new DeviceLocation(37.566, 126.991);

    private PlaceQueryService places;
    private PlaceLikeService likes;
    private QuickDraftService drafts;
    private PlaceRecordService service;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_place_likes, user_place_dislikes, user_place_visits, place_quick_drafts");
        PlaceViewLoader loader = new PlaceViewLoader(
                jdbc, new MediaUrlSigner("integration-key", Duration.ofHours(6)), TestHiddenTasters.none());
        places = new PlaceQueryService(jdbc, loader, TestHiddenTasters.none());
        NearbyPlaceGuard nearby = new NearbyPlaceGuard(jdbc);
        likes = new PlaceLikeService(jdbc, nearby);
        PlaceVisitService visits = new PlaceVisitService(jdbc);
        drafts = new QuickDraftService(jdbc, nearby, visits);
        service = new PlaceRecordService(
                jdbc,
                places,
                loader,
                new PlaceRecordContentWriter(jdbc, new PlacePhotoService(jdbc, TestHiddenTasters.none())),
                drafts,
                likes,
                nearby,
                visits);
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
    }

    @Test
    void 하트한_곳을_기록하면_빠른_기록과_하트가_빠지고_다시_하트할_수_없다() {
        PlaceView place = service.createRecord(
                SECOND,
                SECOND_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG)));
        QuickPlaceDraftRequest draft = new QuickPlaceDraftRequest(
                "KAKAO", "1001", "국밥집", "한식", "서울 중구 을지로 1", 37.566, 126.991, null, null, null, null, NEAR);
        drafts.saveDraft(FIRST, draft.submittedPlace(), draft);
        likes.setLiked(FIRST, place.id(), true);

        service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG)));
        assertThat(drafts.findDrafts(FIRST)).isEmpty();
        assertThat(likes.likedPlaceIds(FIRST)).isEmpty();
        assertThat(service.findMine(FIRST)).hasSize(1);
        assertThatThrownBy(() -> likes.setLiked(FIRST, place.id(), true))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
                    assertThat(exception.getReason()).isEqualTo("내가 등록한 맛집은 내 맛집으로 중복 저장할 수 없습니다.");
                });
    }

    @Test
    void 내_기록의_공개_범위만_한꺼번에_바뀌고_다른_사람_기록과_잘못된_ID는_건너뛴다() {
        PlaceView created = service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PRIVATE, List.of(), List.of(PNG)));
        service.createRecord(
                SECOND,
                SECOND_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PRIVATE, List.of(), List.of(PNG)));

        int changed = service.changeVisibility(
                FIRST,
                List.of(created.id(), created.id(), UUID.randomUUID().toString(), "없는-ID"),
                RecordVisibility.PUBLIC);

        assertThat(changed).isEqualTo(1);
        TasterRecordView changedRecord =
                service.findMine(FIRST).get(0).tasters().get(0);
        assertThat(changedRecord.visibility()).isEqualTo(RecordVisibility.PUBLIC);
        // 공개 범위만 바뀌고 사진·태그·매장 정보는 그대로 남습니다.
        assertThat(changedRecord.photos()).hasSize(1);
        assertThat(changedRecord.tags()).containsExactly("국물이 진한");
        assertThat(changedRecord.visitConditions()).containsExactly("주차 편리");
        assertThat(service.findMine(SECOND).get(0).tasters().get(0).visibility())
                .isEqualTo(RecordVisibility.PRIVATE);
        assertThat(places.findById(created.id(), SECOND).orElseThrow().tasters())
                .extracting(TasterRecordView::tasterName)
                .contains("첫맛객");
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

    @Test
    void 태그_분류가_없거나_매장_이용이면_기록을_저장하지_않는다() {
        for (Map<String, String> tagGroups : List.of(Map.<String, String>of(), Map.of("국물이 진한", "VISIT"))) {
            assertThatThrownBy(() -> service.createRecord(
                            FIRST,
                            FIRST_AUTHOR,
                            unverified("국밥집"),
                            request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG), tagGroups)))
                    .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                        assertThat(exception.getReason()).isEqualTo("태그 분류를 확인해 주세요.");
                    });
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM restaurant_records", Integer.class))
                .isZero();
    }

    @Test
    void 내_기록을_지우면_하위_내용까지_지워지고_다른_맛객_기록과_가게는_남는다() {
        PlaceView created = service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(new MenuInput("국밥", 9000, PNG)), List.of(PNG)));
        service.createRecord(
                SECOND,
                SECOND_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of()));

        assertThat(service.deleteRecord(FIRST, created.id())).isTrue();
        assertThat(service.deleteRecord(FIRST, created.id())).isFalse();

        assertThat(service.findMine(FIRST)).isEmpty();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM restaurant_record_photos", Integer.class))
                .isZero();
        assertThat(jdbc.queryForObject("SELECT count(*) FROM restaurant_record_menus", Integer.class))
                .isZero();
        assertThat(places.findById(created.id(), SECOND).orElseThrow().tasters())
                .extracting(TasterRecordView::tasterName)
                .containsExactly("둘맛객");
    }

    @Test
    void 정해진_매장_이용_조건이_아닌_이름이_있으면_기록을_저장하지_않는다() {
        CreatePlaceRecordRequest request = withVisitConditions(
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG)), List.of("주차 편리", "뷰 좋은 곳"));

        assertThatThrownBy(() -> service.createRecord(FIRST, FIRST_AUTHOR, unverified("국밥집"), request))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
                    assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
                    assertThat(exception.getReason()).isEqualTo("매장 이용 정보를 확인해 주세요.");
                });
        assertThat(jdbc.queryForObject("SELECT count(*) FROM restaurant_records", Integer.class))
                .isZero();
    }

    @Test
    void 매장_이용_조건은_앞뒤_공백을_지우고_빈_값은_건너뛴다() {
        service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                withVisitConditions(
                        request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG)),
                        List.of(" 웨이팅 있는 곳 ", "", "주차 편리")));

        assertThat(service.findMine(FIRST).get(0).tasters().get(0).visitConditions())
                .containsExactly("웨이팅 있는 곳", "주차 편리");
    }

    @Test
    void 다른_기록의_사진이나_메뉴_사진은_수정_기록에_넣을_수_없다() {
        service.createRecord(
                SECOND,
                SECOND_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(new MenuInput("국밥", 9000, PNG)), List.of(PNG)));
        TasterRecordView others = service.findMine(SECOND).get(0).tasters().get(0);
        service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG)));

        assertThatThrownBy(() -> service.createRecord(
                        FIRST,
                        FIRST_AUTHOR,
                        unverified("국밥집"),
                        request("국밥집", RecordVisibility.PUBLIC, List.of(), others.photos())))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> assertThat(exception.getReason())
                        .isEqualTo("다른 맛집의 사진은 수정 기록에 포함할 수 없습니다."));
        assertThatThrownBy(() -> service.createRecord(
                        FIRST,
                        FIRST_AUTHOR,
                        unverified("국밥집"),
                        request(
                                "국밥집",
                                RecordVisibility.PUBLIC,
                                List.of(new MenuInput(
                                        "국밥", 9000, others.menus().get(0).photo())),
                                List.of(PNG))))
                .isInstanceOfSatisfying(ResponseStatusException.class, exception -> assertThat(exception.getReason())
                        .isEqualTo("다른 맛집의 메뉴 사진은 수정 기록에 포함할 수 없습니다."));
        assertThat(service.findMine(SECOND).get(0).tasters().get(0).photos()).hasSize(1);
    }

    @Test
    void 사진_순서를_바꾸고_하나를_빼면_남은_사진만_새_순서로_남는다() {
        service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(PNG, PNG, PNG)));
        List<String> before = service.findMine(FIRST).get(0).tasters().get(0).photos();

        service.createRecord(
                FIRST,
                FIRST_AUTHOR,
                unverified("국밥집"),
                request("국밥집", RecordVisibility.PUBLIC, List.of(), List.of(before.get(2), PNG, before.get(0))));

        List<String> after = service.findMine(FIRST).get(0).tasters().get(0).photos();
        assertThat(after).hasSize(3);
        assertThat(after.get(0)).isEqualTo(before.get(2));
        assertThat(after.get(2)).isEqualTo(before.get(0));
        assertThat(after).doesNotContain(before.get(1));
        assertThat(jdbc.queryForList("SELECT sort_no FROM restaurant_record_photos ORDER BY sort_no", Integer.class))
                .containsExactly(0, 1, 2);
    }

    private static CreatePlaceRecordRequest withVisitConditions(
            CreatePlaceRecordRequest request, List<String> visitConditions) {
        return new CreatePlaceRecordRequest(
                request.providerCode(),
                request.providerPlaceId(),
                request.placeName(),
                request.category(),
                request.address(),
                request.latitude(),
                request.longitude(),
                request.providerPhone(),
                request.providerUrl(),
                request.roadAddress(),
                request.lotAddress(),
                request.reason(),
                request.visibility(),
                request.menus(),
                request.tags(),
                request.tagGroups(),
                visitConditions,
                request.photos(),
                request.deviceLocation());
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
        return request(name, visibility, menus, photos, Map.of("국물이 진한", "TASTE"));
    }

    private static CreatePlaceRecordRequest request(
            String name,
            RecordVisibility visibility,
            List<MenuInput> menus,
            List<String> photos,
            Map<String, String> tagGroups) {
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
                List.of("국물이 진한"),
                tagGroups,
                List.of("주차 편리"),
                photos,
                NEAR);
    }
}
