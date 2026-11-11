package kr.matdagong.place.report;

import static kr.matdagong.place.report.PlaceReportModels.*;

import java.util.List;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 맛집 기본 정보 오류·폐업 제보를 저장합니다. 없는 장소는 받지 않고, 확인 전인 같은 제보(같은 사람·장소·이유)는
 * 새로 만들지 않고 기존 건을 돌려줍니다.
 */
@Service
public class PlaceReportService {
    private final JdbcTemplate jdbc;

    public PlaceReportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional
    public PlaceReportResponse report(UUID accountId, String placeIdValue, PlaceReportRequest request) {
        UUID placeId = PlaceIdentifiers.uuidOrNull(placeIdValue);
        if (placeId == null || !exists(placeId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "맛집 정보를 찾을 수 없어요.");
        }
        String memo = request.memo() == null ? "" : request.memo().trim();
        if (request.reason() == PlaceReportReason.OTHER && memo.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "어떤 정보가 다른지 적어 주세요.");
        }
        List<String> created = jdbc.queryForList(
                """
                INSERT INTO place_reports (report_id, place_id, account_id, reason, memo)
                VALUES (?, ?, ?, ?, NULLIF(?, ''))
                ON CONFLICT (account_id, place_id, reason) WHERE status = 'RECEIVED' DO NOTHING
                RETURNING report_id::text
                """,
                String.class,
                UUID.randomUUID(),
                placeId,
                accountId,
                request.reason().name(),
                memo);
        if (!created.isEmpty()) return new PlaceReportResponse(created.get(0), false);
        String existing = jdbc.queryForObject(
                """
                SELECT report_id::text FROM place_reports
                WHERE account_id = ? AND place_id = ? AND reason = ? AND status = 'RECEIVED'
                """,
                String.class,
                accountId,
                placeId,
                request.reason().name());
        return new PlaceReportResponse(existing, true);
    }

    private boolean exists(UUID placeId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM restaurant_places WHERE place_id = ?)", Boolean.class, placeId));
    }
}
