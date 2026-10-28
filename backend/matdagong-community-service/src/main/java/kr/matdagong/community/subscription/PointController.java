package kr.matdagong.community.subscription;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 포인트 잔액과 적립·사용 원장을 로그인 사용자에게 제공합니다. */
@RestController
@RequestMapping("/api/v1/points")
public class PointController {
    private final JdbcTemplate jdbc;

    public PointController(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @GetMapping
    public PointAccount points(@AuthenticationPrincipal Jwt jwt) {
        UUID accountId = accountId(jwt);
        Long balance = jdbc.queryForObject(
                "SELECT COALESCE(SUM(point_amt), 0) FROM user_point_history WHERE account_id = ?",
                Long.class, accountId);
        List<PointEntry> history = jdbc.query("""
                SELECT point_history_id, event_type, title, memo, point_amt, reg_dt
                FROM user_point_history
                WHERE account_id = ?
                ORDER BY reg_dt DESC, point_history_id DESC
                LIMIT 100
                """, (rs, row) -> new PointEntry(
                rs.getObject("point_history_id", UUID.class),
                rs.getString("event_type"),
                rs.getString("title"),
                rs.getString("memo"),
                rs.getInt("point_amt"),
                rs.getTimestamp("reg_dt").toInstant()), accountId);
        return new PointAccount(balance == null ? 0L : balance, history);
    }

    private UUID accountId(Jwt jwt) {
        try {
            return UUID.fromString(jwt.getSubject());
        } catch (IllegalArgumentException exception) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.UNAUTHORIZED, "인증 계정 ID가 올바르지 않습니다.");
        }
    }

    public record PointAccount(long balance, List<PointEntry> history) {}
    public record PointEntry(UUID historyId, String eventType, String title, String memo, int amount, Instant createdAt) {}
}
