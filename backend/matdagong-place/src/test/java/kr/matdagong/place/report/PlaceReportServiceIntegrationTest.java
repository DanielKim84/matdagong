package kr.matdagong.place.report;

import static kr.matdagong.place.report.PlaceReportModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** 맛집 정보 제보의 중복 방지와 입력 확인을 실제 스키마로 검증합니다. */
class PlaceReportServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID FIRST = UUID.fromString("11111111-1111-1111-1111-111111111111");

    private PlaceReportService reports;
    private String placeId;

    @BeforeEach
    void setUp() {
        truncate("place_reports, restaurant_places");
        reports = new PlaceReportService(jdbc);
        placeId = UUID.randomUUID().toString();
        jdbc.update(
                """
                INSERT INTO restaurant_places (place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?::uuid, '1001', '국밥집', '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId);
    }

    @Test
    void 맛집_정보_제보는_같은_이유로_거듭_보내도_한_건이고_없는_장소나_설명_없는_기타는_받지_않는다() {
        var first = reports.report(FIRST, placeId, new PlaceReportRequest(PlaceReportReason.CLOSED, " 문 닫았어요 "));
        var again = reports.report(FIRST, placeId, new PlaceReportRequest(PlaceReportReason.CLOSED, null));
        reports.report(FIRST, placeId, new PlaceReportRequest(PlaceReportReason.WRONG_PHONE, null));

        assertThat(first.duplicate()).isFalse();
        assertThat(again.duplicate()).isTrue();
        assertThat(jdbc.queryForObject("SELECT memo FROM place_reports WHERE reason = 'CLOSED'", String.class))
                .isEqualTo("문 닫았어요");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM place_reports", Integer.class))
                .isEqualTo(2);
        for (String missingPlace : new String[] {UUID.randomUUID().toString(), "없는-ID"}) {
            assertThatThrownBy(() ->
                            reports.report(FIRST, missingPlace, new PlaceReportRequest(PlaceReportReason.CLOSED, null)))
                    .isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode())
                            .isEqualTo(HttpStatus.NOT_FOUND));
        }
        assertThatThrownBy(() -> reports.report(FIRST, placeId, new PlaceReportRequest(PlaceReportReason.OTHER, " ")))
                .isInstanceOfSatisfying(ResponseStatusException.class, error -> assertThat(error.getStatusCode())
                        .isEqualTo(HttpStatus.BAD_REQUEST));
    }
}
