package kr.matdagong.common.jdbc;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.time.OffsetDateTime;

/** timestamptz 칼럼은 OffsetDateTime으로 읽고, 응답이 Instant인 곳은 여기서 바꿔 JSON 형식을 유지합니다. */
public final class JdbcTimes {
    private JdbcTimes() {}

    /** 값이 NULL이면 null을 반환합니다. */
    public static Instant instant(ResultSet rs, String column) throws SQLException {
        OffsetDateTime value = rs.getObject(column, OffsetDateTime.class);
        return value == null ? null : value.toInstant();
    }
}
