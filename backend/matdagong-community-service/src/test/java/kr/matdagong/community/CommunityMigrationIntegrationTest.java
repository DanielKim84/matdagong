package kr.matdagong.community;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;
import javax.sql.DataSource;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

/** 커뮤니티 Flyway 마이그레이션을 빈 DB에 단계별로 적용해 데이터 이전이 깨지지 않는지 확인합니다. */
class CommunityMigrationIntegrationTest extends EmbeddedPostgresTestSupport {
    @Test
    void 예전_단일_배경은_갤러리로_옮긴_뒤_칼럼을_지운다() {
        DataSource legacy = emptyDatabase("legacy_cover_migration");
        JdbcTemplate legacyJdbc = new JdbcTemplate(legacy);
        migrate(legacy, "33");

        // V33 이후 예전 단일 배경 업로드로만 저장된 배경(갤러리에는 없음)을 만듭니다.
        UUID accountId = UUID.randomUUID();
        legacyJdbc.update(
                "INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '맛객', 1)", accountId);
        legacyJdbc.update(
                "UPDATE user_profiles SET profile_cover_data = ?, profile_cover_mime_type = 'image/png' WHERE account_id = ?",
                new byte[] {1, 2, 3},
                accountId);

        migrate(legacy, null);

        assertThat(legacyJdbc.queryForObject(
                        "SELECT count(*) FROM user_profile_cover_photos WHERE account_id = ? AND sort_no = 0",
                        Integer.class,
                        accountId))
                .isEqualTo(1);
        assertThat(legacyJdbc.queryForObject(
                        """
                        SELECT count(*) FROM information_schema.columns
                        WHERE table_name = 'user_profiles' AND column_name LIKE 'profile_cover%'
                        """,
                        Integer.class))
                .isZero();
    }
}
