package kr.matdagong.place.account;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.place.catalog.SamplePlaceCatalog;
import kr.matdagong.place.report.PlaceReportModels.PlaceReportReason;
import kr.matdagong.place.report.PlaceReportModels.PlaceReportRequest;
import kr.matdagong.place.report.PlaceReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 맛다공 탈퇴 때 장소 서비스의 내 데이터만 지우는지 실제 스키마로 확인합니다. */
class AccountDataServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID FIRST = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID SECOND = UUID.fromString("22222222-2222-2222-2222-222222222222");

    @BeforeEach
    void setUp() {
        truncate("restaurant_places, user_place_likes, user_place_dislikes, user_recent_places, place_reports");
    }

    @Test
    void 탈퇴하면_장소_서비스의_내_데이터만_모두_지워진다() {
        UUID placeId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO restaurant_places (place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?, '1001', '국밥집', '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId);
        jdbc.update(
                """
                INSERT INTO restaurant_records (record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?, ?, '첫맛객', '국물이 진하고 맛있어요.', 'PUBLIC')
                """,
                UUID.randomUUID(),
                placeId,
                FIRST);
        jdbc.update(
                "INSERT INTO user_place_likes (account_id, place_id) VALUES (?, 'p-001'), (?, 'p-001')", FIRST, SECOND);
        jdbc.update("INSERT INTO user_place_dislikes (account_id, place_id) VALUES (?, 'p-002')", FIRST);
        jdbc.update("INSERT INTO user_recent_places (account_id, place_id) VALUES (?, ?)", FIRST, placeId.toString());
        new PlaceReportService(jdbc, new SamplePlaceCatalog())
                .report(FIRST, "p-001", new PlaceReportRequest(PlaceReportReason.CLOSED, null));

        new AccountDataService(jdbc).deleteAll(FIRST);
        new AccountDataService(jdbc).deleteAll(FIRST);

        for (String table : List.of(
                "restaurant_records",
                "user_place_likes",
                "user_place_dislikes",
                "user_recent_places",
                "place_reports")) {
            assertThat(jdbc.queryForObject(
                            "SELECT count(*) FROM " + table + " WHERE account_id = ?", Integer.class, FIRST))
                    .as(table)
                    .isZero();
        }
        assertThat(jdbc.queryForList(
                        "SELECT place_id FROM user_place_likes WHERE account_id = ?", String.class, SECOND))
                .containsExactly("p-001");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM restaurant_places", Integer.class))
                .isEqualTo(1);
    }
}
