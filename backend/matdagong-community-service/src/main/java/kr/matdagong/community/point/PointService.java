package kr.matdagong.community.point;

import static kr.matdagong.community.point.PointModels.*;

import java.util.List;
import java.util.UUID;
import kr.matdagong.common.jdbc.JdbcTimes;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 포인트 잔액과 적립·사용 원장을 조회합니다.
 * 지급·사용 처리는 아직 연결되지 않아 조회만 제공합니다. 연결 기준은 docs/point-security.md를 따릅니다.
 */
@Service
public class PointService {
    private static final int HISTORY_LIMIT = 100;

    private final JdbcTemplate jdbc;

    public PointService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 잔액은 원장 전체 합계이고, 화면에는 최근 원장 100건만 보여 줍니다. */
    @Transactional(readOnly = true)
    public PointAccount points(UUID accountId) {
        Long balance = jdbc.queryForObject(
                "SELECT COALESCE(SUM(point_amt), 0) FROM user_point_history WHERE account_id = ?",
                Long.class,
                accountId);
        List<PointEntry> history = jdbc.query(
                """
                SELECT point_history_id, title, memo, point_amt, reg_dt
                FROM user_point_history
                WHERE account_id = ?
                ORDER BY reg_dt DESC, point_history_id DESC
                LIMIT ?
                """,
                (rs, row) -> new PointEntry(
                        rs.getObject("point_history_id", UUID.class),
                        rs.getString("title"),
                        rs.getString("memo"),
                        rs.getInt("point_amt"),
                        JdbcTimes.instant(rs, "reg_dt")),
                accountId,
                HISTORY_LIMIT);
        return new PointAccount(balance == null ? 0L : balance, history);
    }
}
