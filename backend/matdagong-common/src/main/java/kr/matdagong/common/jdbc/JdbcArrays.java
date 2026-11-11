package kr.matdagong.common.jdbc;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.UUID;

/**
 * SQL 배열 칼럼을 주고받는 도우미입니다. ARRAY(...)·array_agg로 한 행에 모아 받은 값을 목록으로 읽고, 여러 값을
 * {@code = ANY(?::uuid[])}에 넣을 배열을 만듭니다. 쉼표로 이어 붙여 받으면 값 안의 쉼표에서 잘못 나뉘므로, 여러 값은
 * 배열 칼럼으로 받습니다. 배열 순서(ORDER BY)를 그대로 지킵니다.
 */
public final class JdbcArrays {
    private JdbcArrays() {}

    /** 값이 NULL이면 빈 목록입니다. */
    public static List<String> strings(ResultSet rs, String column) throws SQLException {
        return Arrays.stream(values(rs, column)).map(String::valueOf).toList();
    }

    /** uuid[] 칼럼을 읽습니다. 값이 NULL이면 빈 목록입니다. */
    public static List<UUID> uuids(ResultSet rs, String column) throws SQLException {
        return Arrays.stream(values(rs, column))
                .map(value -> value instanceof UUID uuid ? uuid : UUID.fromString(String.valueOf(value)))
                .toList();
    }

    /** integer[] 칼럼을 읽습니다. 배열 안의 NULL(예: 비워 둔 가격)은 null 원소로 둡니다. 값이 NULL이면 빈 목록입니다. */
    public static List<Integer> integers(ResultSet rs, String column) throws SQLException {
        return Arrays.stream(values(rs, column))
                .map(value -> value == null ? null : ((Number) value).intValue())
                .toList();
    }

    /** boolean[] 칼럼을 읽습니다. 배열 안의 NULL은 false로 봅니다. 값이 NULL이면 빈 목록입니다. */
    public static List<Boolean> booleans(ResultSet rs, String column) throws SQLException {
        return Arrays.stream(values(rs, column)).map(Boolean.TRUE::equals).toList();
    }

    /** {@code = ANY(?::uuid[])}에 바인딩할 값입니다. 빈 목록이면 아무것도 맞지 않는 빈 배열입니다. */
    public static String[] uuidParam(Collection<UUID> ids) {
        return ids.stream().map(UUID::toString).toArray(String[]::new);
    }

    private static Object[] values(ResultSet rs, String column) throws SQLException {
        Array array = rs.getArray(column);
        return array == null ? new Object[0] : (Object[]) array.getArray();
    }
}
