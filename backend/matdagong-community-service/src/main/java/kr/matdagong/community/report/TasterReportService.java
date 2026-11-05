package kr.matdagong.community.report;

import static kr.matdagong.community.report.ReportModels.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.web.ApiErrors;
import kr.matdagong.community.notification.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 맛객 신고를 받고, 확인 전 신고가 기준에 닿으면 관리자 확인 목록에 올리거나 자동으로 가립니다.
 * 사용자가 아직 많지 않아 기준을 낮게 둡니다(3명이면 확인 목록, 5명이면 자동 가림).
 */
@Service
public class TasterReportService {
    static final int REVIEW_THRESHOLD = 3;
    static final int HIDE_THRESHOLD = 5;
    static final String ALREADY_REPORTED = "이미 신고한 맛객이에요. 운영팀이 확인하고 있어요.";

    private final JdbcTemplate jdbc;
    private final NotificationService notifications;

    public TasterReportService(JdbcTemplate jdbc, NotificationService notifications) {
        this.jdbc = jdbc;
        this.notifications = notifications;
    }

    @Transactional
    public ReportResponse report(UUID reporterId, UUID targetId, ReportRequest request) {
        if (reporterId.equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "내 프로필은 신고할 수 없어요.");
        }
        // 운영팀이 무엇이 문제인지 확인할 수 있도록 어떤 이유든 설명을 꼭 받습니다.
        if (request.memo().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "어떤 점이 문제인지 적어 주세요.");
        }
        if (!profileExists(reporterId)) throw ApiErrors.profileRequired();
        // 같은 맛객에게 신고가 동시에 들어와도 기준 확인이 한 번씩 차례로 되도록 신고당한 프로필을 잠급니다.
        List<UUID> target = jdbc.query(
                "SELECT account_id FROM user_profiles WHERE account_id = ? FOR UPDATE",
                (rs, row) -> rs.getObject(1, UUID.class),
                targetId);
        if (target.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "맛객 정보를 찾을 수 없어요.");

        List<String> created = jdbc.queryForList(
                """
                INSERT INTO taster_reports (report_id, target_account_id, reporter_account_id, reason, memo, place_id)
                VALUES (?, ?, ?, ?, NULLIF(?, ''), ?)
                ON CONFLICT (reporter_account_id, target_account_id) WHERE status = 'PENDING' DO NOTHING
                RETURNING report_id::text
                """,
                String.class,
                UUID.randomUUID(),
                targetId,
                reporterId,
                request.reason().name(),
                request.memo(),
                request.placeId());
        if (created.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, ALREADY_REPORTED);
        applyThresholds(targetId);
        return new ReportResponse(created.get(0));
    }

    /** 내가 신고했고 아직 확인 전인 맛객 ID입니다. 화면은 이 맛객의 신고 버튼을 막습니다. */
    @Transactional(readOnly = true)
    public List<String> myPendingTargets(UUID reporterId) {
        return jdbc.queryForList(
                "SELECT target_account_id::text FROM taster_reports WHERE reporter_account_id = ? AND status = 'PENDING'",
                String.class,
                reporterId);
    }

    /** 지금 자동으로 가려진 맛객 ID입니다. 장소 서비스가 이 맛객의 기록·사진을 빼고 보여 줍니다. */
    @Transactional(readOnly = true)
    public List<UUID> hiddenTasters() {
        return jdbc.query(
                "SELECT account_id FROM taster_moderations WHERE hidden_at IS NOT NULL",
                (rs, row) -> rs.getObject(1, UUID.class));
    }

    private void applyThresholds(UUID targetId) {
        int reporters = count(
                "SELECT count(*) FROM taster_reports WHERE target_account_id = ? AND status = 'PENDING'", targetId);
        boolean hasIllegalPhoto = count(
                        """
                        SELECT count(*) FROM taster_reports
                        WHERE target_account_id = ? AND status = 'PENDING' AND reason = 'ILLEGAL_PHOTO'
                        """,
                        targetId)
                > 0;
        boolean needsReview = reporters >= REVIEW_THRESHOLD || hasIllegalPhoto;
        boolean shouldHide = reporters >= HIDE_THRESHOLD;
        if (!needsReview) return;

        // 이미 채운 시각은 그대로 두고, 이번에 처음 가렸을 때만 새로 채운 가린 시각을 돌려받아 본인에게 알립니다.
        List<OffsetDateTime> newlyHidden = jdbc.query(
                """
                INSERT INTO taster_moderations (account_id, review_requested_at, hidden_at)
                VALUES (?, now(), CASE WHEN ?::boolean THEN now() END)
                ON CONFLICT (account_id) DO UPDATE
                SET review_requested_at = COALESCE(taster_moderations.review_requested_at, now()),
                    hidden_at = COALESCE(taster_moderations.hidden_at, EXCLUDED.hidden_at),
                    upd_dt = now()
                RETURNING CASE WHEN hidden_at = now() THEN hidden_at END
                """,
                (rs, row) -> rs.getObject(1, OffsetDateTime.class),
                targetId,
                shouldHide);
        OffsetDateTime hiddenAt = newlyHidden.isEmpty() ? null : newlyHidden.get(0);
        if (hiddenAt != null) {
            notifications.hiddenByReports(
                    targetId, "hidden-by-reports:" + hiddenAt.toInstant().toEpochMilli());
        }
    }

    private int count(String sql, Object... args) {
        Integer value = jdbc.queryForObject(sql, Integer.class, args);
        return value == null ? 0 : value;
    }

    private boolean profileExists(UUID accountId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE account_id = ?)", Boolean.class, accountId));
    }
}
