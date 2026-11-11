package kr.matdagong.place.recent;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.catalog.PlaceQueryService;
import kr.matdagong.place.catalog.PlaceViewLoader;
import kr.matdagong.place.media.MediaUrlSigner;
import kr.matdagong.place.profile.TestHiddenTasters;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 최근 본 장소의 순서와, 15일 지난 행을 본 사람 것만 정리하는지 실제 스키마로 확인합니다. */
class RecentPlaceServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID FIRST = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SECOND = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private RecentPlaceService recentPlaces;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_recent_places");
        PlaceViewLoader loader = new PlaceViewLoader(
                jdbc, new MediaUrlSigner("integration-key", Duration.ofHours(6)), TestHiddenTasters.none());
        recentPlaces =
                new RecentPlaceService(jdbc, loader, new PlaceQueryService(jdbc, loader, TestHiddenTasters.none()));
    }

    @Test
    void 최근_본_장소는_본_순서대로_돌려준다() {
        String older = publicPlace("국밥집");
        String newer = publicPlace("냉면집");

        recentPlaces.remember(SECOND, older);
        jdbc.update("UPDATE user_recent_places SET viewed_at = now() - INTERVAL '1 minute'");
        recentPlaces.remember(SECOND, newer);

        assertThat(recentPlaces.findRecent(SECOND)).extracting(PlaceView::id).containsExactly(newer, older);
    }

    @Test
    void 장소를_보면_본_사람의_15일_지난_행만_지우고_남의_지난_행은_조회에서만_빠진다() {
        List<String> viewedIds = List.of(publicPlace("국밥집"), publicPlace("냉면집"));
        recentPlaces.remember(FIRST, viewedIds.get(0));
        recentPlaces.remember(SECOND, viewedIds.get(0));
        jdbc.update("UPDATE user_recent_places SET viewed_at = now() - INTERVAL '16 days'");

        recentPlaces.remember(FIRST, viewedIds.get(1));

        assertThat(placeIds(FIRST)).containsExactly(viewedIds.get(1));
        assertThat(placeIds(SECOND)).containsExactly(viewedIds.get(0));
        assertThat(recentPlaces.findRecent(SECOND)).isEmpty();
    }

    @Test
    void 최근_본_장소는_30곳까지만_남기고_가장_오래전에_본_곳부터_지운다() {
        String oldest = publicPlace("가장 오래전");
        recentPlaces.remember(SECOND, oldest);
        jdbc.update("UPDATE user_recent_places SET viewed_at = now() - INTERVAL '1 hour'");
        for (int index = 0; index < 30; index++) {
            recentPlaces.remember(SECOND, publicPlace("맛집 " + index));
        }

        assertThat(placeIds(SECOND)).hasSize(30).doesNotContain(oldest);
    }

    @Test
    void UUID가_아니거나_없는_장소는_최근_본_목록에_남기지_않는다() {
        for (String placeId : List.of("없는-ID", UUID.randomUUID().toString())) {
            assertThatThrownBy(() -> recentPlaces.remember(SECOND, placeId))
                    .isInstanceOfSatisfying(
                            ResponseStatusException.class,
                            exception -> assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND));
        }
        assertThat(placeIds(SECOND)).isEmpty();
    }

    private static List<String> placeIds(UUID accountId) {
        return jdbc.queryForList(
                "SELECT place_id FROM user_recent_places WHERE account_id = ?", String.class, accountId);
    }

    /** 다른 사람에게도 보이도록 공개 기록이 하나 있는 DB 장소를 만듭니다. */
    private static String publicPlace(String name) {
        UUID placeId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO restaurant_places (place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?, ?, ?, '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId,
                placeId.toString(),
                name);
        jdbc.update(
                """
                INSERT INTO restaurant_records (record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?, ?, '첫맛객', '국물이 진하고 맛있어요.', 'PUBLIC')
                """,
                UUID.randomUUID(),
                placeId,
                FIRST);
        return placeId.toString();
    }
}
