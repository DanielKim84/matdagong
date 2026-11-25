package kr.matdagong.common.test;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.List;
import org.springframework.jdbc.core.JdbcTemplate;

/** 현재 Flyway 스키마에서 테이블·칼럼 설명 누락을 찾습니다. 제거된 칼럼의 옛 설명은 검사 대상이 아닙니다. */
public final class SchemaDocumentation {
    private SchemaDocumentation() {}

    public static void assertComplete(JdbcTemplate jdbc) {
        List<String> missing = jdbc.queryForList(
                """
                SELECT c.relname AS name
                FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> 'flyway_schema_history'
                  AND nullif(btrim(obj_description(c.oid, 'pg_class')), '') IS NULL
                UNION ALL
                SELECT c.relname || '.' || a.attname AS name
                FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
                JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname <> 'flyway_schema_history'
                  AND a.attnum > 0 AND NOT a.attisdropped
                  AND nullif(btrim(col_description(c.oid, a.attnum)), '') IS NULL
                ORDER BY name
                """,
                String.class);
        assertEquals(List.of(), missing, "테이블·칼럼 설명은 새 Flyway 마이그레이션으로 채워 주세요.");
    }
}
