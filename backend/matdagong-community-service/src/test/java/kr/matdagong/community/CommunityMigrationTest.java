package kr.matdagong.community;

import static org.assertj.core.api.Assertions.assertThat;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

/** 실제 PostgreSQL에 커뮤니티 Flyway 마이그레이션을 처음부터 적용해 스키마 변경이 깨지지 않는지 확인합니다. */
class CommunityMigrationTest {
    @Test
    void 예전_단일_배경은_갤러리로_옮긴_뒤_칼럼을_지운다() throws Exception {
        try (EmbeddedPostgres postgres = EmbeddedPostgres.start()) {
            DataSource dataSource = postgres.getPostgresDatabase();
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").target("33").load().migrate();

            // V33 이후 예전 단일 배경 업로드로만 저장된 배경(갤러리에는 없음)을 만듭니다.
            UUID accountId = UUID.randomUUID();
            jdbc.update("INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '맛객', 1)", accountId);
            jdbc.update("UPDATE user_profiles SET profile_cover_data = ?, profile_cover_mime_type = 'image/png' WHERE account_id = ?",
                    new byte[] {1, 2, 3}, accountId);

            Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();

            assertThat(jdbc.queryForObject(
                    "SELECT count(*) FROM user_profile_cover_photos WHERE account_id = ? AND sort_no = 0", Integer.class, accountId))
                    .isEqualTo(1);
            assertThat(jdbc.queryForObject("""
                    SELECT count(*) FROM information_schema.columns
                    WHERE table_name = 'user_profiles' AND column_name LIKE 'profile_cover%'
                    """, Integer.class)).isZero();
        }
    }
}
