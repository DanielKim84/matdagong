package kr.matdagong.place.recent;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.catalog.PlaceQueryService;
import kr.matdagong.place.catalog.PlaceViewLoader;
import kr.matdagong.place.catalog.SamplePlaceCatalog;
import kr.matdagong.place.media.MediaUrlSigner;
import kr.matdagong.place.profile.TestHiddenTasters;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 최근 본 장소의 순서와, 15일 지난 행을 본 사람 것만 정리하는지 실제 스키마로 확인합니다. */
class RecentPlaceServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID FIRST = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SECOND = UUID.fromString("22222222-2222-2222-2222-222222222222");

    private final SamplePlaceCatalog samples = new SamplePlaceCatalog();
    private RecentPlaceService recentPlaces;

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_recent_places");
        PlaceViewLoader loader = new PlaceViewLoader(
                jdbc, new MediaUrlSigner("integration-key", Duration.ofHours(6)), TestHiddenTasters.none());
        recentPlaces = new RecentPlaceService(
                jdbc, samples, loader, new PlaceQueryService(jdbc, samples, loader, TestHiddenTasters.none()));
    }

    @Test
    void 최근_본_장소는_샘플과_DB_장소를_본_순서대로_함께_돌려준다() {
        String databaseId = publicPlace("국밥집");
        String sampleId = samples.findAll(null).get(0).id();

        recentPlaces.remember(SECOND, databaseId);
        jdbc.update("UPDATE user_recent_places SET viewed_at = now() - INTERVAL '1 minute'");
        recentPlaces.remember(SECOND, sampleId);

        assertThat(recentPlaces.findRecent(SECOND)).extracting(PlaceView::id).containsExactly(sampleId, databaseId);
    }

    @Test
    void 장소를_보면_본_사람의_15일_지난_행만_지우고_남의_지난_행은_조회에서만_빠진다() {
        List<String> sampleIds =
                samples.findAll(null).stream().map(PlaceView::id).toList();
        recentPlaces.remember(FIRST, sampleIds.get(0));
        recentPlaces.remember(SECOND, sampleIds.get(0));
        jdbc.update("UPDATE user_recent_places SET viewed_at = now() - INTERVAL '16 days'");

        recentPlaces.remember(FIRST, sampleIds.get(1));

        assertThat(placeIds(FIRST)).containsExactly(sampleIds.get(1));
        assertThat(placeIds(SECOND)).containsExactly(sampleIds.get(0));
        assertThat(recentPlaces.findRecent(SECOND)).isEmpty();
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
