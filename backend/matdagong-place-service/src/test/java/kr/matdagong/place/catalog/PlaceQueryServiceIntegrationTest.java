package kr.matdagong.place.catalog;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.media.MediaUrlSigner;
import kr.matdagong.place.profile.TestHiddenTasters;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 장소 검색어가 글자 그대로 검색되는지와, 신고로 가려진 맛객의 기록이 다른 사람에게 빠지는지 실제 스키마로 확인합니다. */
class PlaceQueryServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID VIEWER = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID HIDDEN = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private PlaceQueryService places;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places");
        SamplePlaceCatalog samples = new SamplePlaceCatalog();
        places = new PlaceQueryService(
                jdbc,
                samples,
                new PlaceViewLoader(
                        jdbc, new MediaUrlSigner("integration-key", Duration.ofHours(6)), TestHiddenTasters.none()),
                TestHiddenTasters.none());
        publicPlace("국밥집");
        publicPlace("100% 국밥");
        publicPlace("면_식당");
        publicPlace("역슬래시\\분식");
    }

    @Test
    void 검색어의_퍼센트와_밑줄과_역슬래시는_글자_그대로_찾는다() {
        assertThat(names("%")).containsExactly("100% 국밥");
        assertThat(names("_")).containsExactly("면_식당");
        assertThat(names("\\")).containsExactly("역슬래시\\분식");
        assertThat(names("면_")).containsExactly("면_식당");
    }

    @Test
    void 일반_검색어는_예전처럼_이름의_일부로_찾는다() {
        assertThat(names("국밥")).containsExactlyInAnyOrder("국밥집", "100% 국밥");
    }

    @Test
    void 가려진_맛객의_기록은_다른_사람에게_빠지고_본인에게만_보인다() {
        PlaceQueryService hiddenAware = new PlaceQueryService(
                jdbc,
                new SamplePlaceCatalog(),
                new PlaceViewLoader(
                        jdbc, new MediaUrlSigner("integration-key", Duration.ofHours(6)), TestHiddenTasters.of(HIDDEN)),
                TestHiddenTasters.of(HIDDEN));
        UUID onlyHidden = place("가려진집");
        record(onlyHidden, HIDDEN);
        UUID shared = place("함께간집");
        record(shared, HIDDEN);
        record(shared, VIEWER);

        assertThat(hiddenAware.findAll("가려진집", VIEWER)).isEmpty();
        assertThat(hiddenAware.findById(shared.toString(), VIEWER)).hasValueSatisfying(view -> {
            assertThat(view.tasters()).extracting(TasterRecordView::tasterId).containsExactly(VIEWER.toString());
            assertThat(view.recordCount()).isOne();
        });
        assertThat(hiddenAware.findAll("가려진집", HIDDEN)).singleElement().satisfies(view -> assertThat(view.tasters())
                .extracting(TasterRecordView::tasterId)
                .containsExactly(HIDDEN.toString()));
    }

    /** 샘플 장소도 함께 검색되므로 DB 장소 이름만 골라 봅니다. */
    private List<String> names(String query) {
        return places.findAll(query, VIEWER).stream()
                .filter(place -> PlaceIdentifiers.uuidOrNull(place.id()) != null)
                .map(PlaceView::name)
                .toList();
    }

    private static void publicPlace(String name) {
        record(place(name), VIEWER);
    }

    private static UUID place(String name) {
        UUID placeId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO restaurant_places (place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?, ?, ?, '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId,
                placeId.toString(),
                name);
        return placeId;
    }

    private static void record(UUID placeId, UUID accountId) {
        jdbc.update(
                """
                INSERT INTO restaurant_records (record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?, ?, '첫맛객', '국물이 진하고 맛있어요.', 'PUBLIC')
                """,
                UUID.randomUUID(),
                placeId,
                accountId);
    }
}
