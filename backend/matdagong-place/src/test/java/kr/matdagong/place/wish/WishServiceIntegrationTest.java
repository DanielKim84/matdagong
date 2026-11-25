package kr.matdagong.place.wish;

import static kr.matdagong.place.wish.WishModels.*;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.catalog.PlaceQueryService;
import kr.matdagong.place.catalog.PlaceViewLoader;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import kr.matdagong.place.like.PlaceLikeService;
import kr.matdagong.place.location.NearbyPlaceGuard;
import kr.matdagong.place.media.MediaUrlSigner;
import kr.matdagong.place.profile.TestHiddenTasters;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 맛객 기록이 없는 가게도 가볼 곳으로 저장되고, 저장한 사람에게만 보이는지 실제 스키마로 확인합니다. */
class WishServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID ME = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OTHER = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final WishPlaceRequest JEJU = new WishPlaceRequest(
            "KAKAO",
            "kakao-jeju-1",
            "제주 고기국수",
            "음식점 > 한식 > 국수",
            "제주 제주시 연동 1",
            33.489,
            126.498,
            null,
            null,
            "제주 제주시 연동 1",
            null);

    private PlaceQueryService places;
    private PlaceLikeService likes;
    private WishService wishes;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_place_likes, user_place_dislikes, user_place_visits");
        PlaceViewLoader loader = new PlaceViewLoader(
                jdbc, new MediaUrlSigner("integration-key", Duration.ofHours(6)), TestHiddenTasters.none());
        places = new PlaceQueryService(jdbc, loader, TestHiddenTasters.none());
        likes = new PlaceLikeService(jdbc, new NearbyPlaceGuard(jdbc));
        wishes = new WishService(jdbc, places, likes);
    }

    @Test
    void 기록이_없는_먼_지역_가게도_가볼_곳으로_저장되고_나에게만_보인다() {
        var saved = wishes.save(ME, verified(), JEJU);

        assertThat(saved.name()).isEqualTo("제주 고기국수");
        assertThat(saved.tasters()).isEmpty();
        assertThat(likes.likedPlaceIds(ME)).containsExactly(saved.id());
        assertThat(places.findAll("제주 고기국수", ME)).extracting(view -> view.id()).contains(saved.id());
        assertThat(places.findAll("제주 고기국수", OTHER))
                .extracting(view -> view.id())
                .doesNotContain(saved.id());
    }

    @Test
    void 같은_가게를_다시_저장해도_하트는_하나만_남는다() {
        var saved = wishes.save(ME, verified(), JEJU);

        var again = wishes.save(ME, verified(), JEJU);

        assertThat(again.id()).isEqualTo(saved.id());
        assertThat(likes.likedPlaceIds(ME)).containsExactly(saved.id());
    }

    @Test
    void 별로였던_가게를_가볼_곳으로_저장하면_별로였어요_표시를_지운다() {
        var saved = wishes.save(ME, verified(), JEJU);
        jdbc.update("DELETE FROM user_place_likes");
        jdbc.update("INSERT INTO user_place_dislikes (account_id, place_id) VALUES (?, ?::uuid)", ME, saved.id());

        wishes.save(ME, verified(), JEJU);

        assertThat(likes.likedPlaceIds(ME)).containsExactly(saved.id());
        assertThat(likes.dislikedPlaceIds(ME)).isEmpty();
    }

    @Test
    void 내_기록이_있는_가게는_하트하지_않는다() {
        var saved = wishes.save(ME, verified(), JEJU);
        jdbc.update("DELETE FROM user_place_likes");
        jdbc.update(
                """
                INSERT INTO restaurant_records (record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?::uuid, ?, '나', '국물이 진하고 맛있어요.', 'PRIVATE')
                """,
                UUID.randomUUID(),
                saved.id(),
                ME);

        wishes.save(ME, verified(), JEJU);

        assertThat(likes.likedPlaceIds(ME)).isEmpty();
    }

    private static PlaceInfo verified() {
        return new PlaceInfo("제주 고기국수", "제주 제주시 연동 1", 33.489, 126.498, null, null, "제주 제주시 연동 1", null, true);
    }
}
