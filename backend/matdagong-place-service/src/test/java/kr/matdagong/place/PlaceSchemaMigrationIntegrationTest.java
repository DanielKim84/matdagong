package kr.matdagong.place;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import javax.sql.DataSource;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

/** V16이 문자열 장소 ID를 UUID 외래 키로 바꾸며 가리킬 곳이 없는 행만 지우고, 나머지 정리를 적용하는지 확인합니다. */
class PlaceSchemaMigrationIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID ME = UUID.fromString("11111111-1111-1111-1111-111111111111");

    @Test
    void V16은_있는_장소를_가리키는_행만_UUID로_옮기고_나머지는_지운다() {
        DataSource target = emptyDatabase("place_v16");
        migrate(target, "15");
        JdbcTemplate db = new JdbcTemplate(target);
        UUID placeId = UUID.randomUUID();
        db.update(
                """
                INSERT INTO restaurant_places (place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?, '1001', '국밥집', '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId);
        // 대문자로 저장된 UUID 문자열도 같은 장소로 옮기고, UUID가 아닌 ID와 없는 장소 ID는 지웁니다.
        db.update(
                "INSERT INTO user_place_likes (account_id, place_id) VALUES (?, ?), (?, 'p-001'), (?, ?)",
                ME,
                placeId.toString().toUpperCase(),
                UUID.randomUUID(),
                UUID.randomUUID(),
                UUID.randomUUID().toString());
        db.update(
                "INSERT INTO user_place_visits (account_id, place_id, visit_source) VALUES (?, ?, 'RECORD'), (?, 'p-002', 'HEART')",
                ME,
                placeId.toString(),
                ME);
        db.update(
                """
                INSERT INTO place_quick_drafts (draft_id, account_id, provider_place_id, place_name, address, latitude, longitude)
                VALUES (?, ?, '1001', '국밥집', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                UUID.randomUUID(),
                ME);

        migrate(target, null);

        assertThat(db.queryForList("SELECT place_id FROM user_place_likes", UUID.class))
                .containsExactly(placeId);
        assertThat(db.queryForList("SELECT place_id FROM user_place_visits", UUID.class))
                .containsExactly(placeId);
        assertThat(db.queryForObject("SELECT count(*) FROM place_quick_drafts WHERE account_id = ?", Integer.class, ME))
                .isOne();
        assertThat(db.queryForObject(
                        """
                        SELECT count(*) FROM information_schema.columns
                        WHERE (table_name = 'restaurant_records' AND column_name = 'author_avatar_variant')
                           OR (table_name = 'place_quick_drafts' AND column_name = 'draft_id')
                        """,
                        Integer.class))
                .isZero();
        assertThatThrownBy(() -> db.update(
                        "INSERT INTO user_place_dislikes (account_id, place_id) VALUES (?, ?)", ME, UUID.randomUUID()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void 기록_태그는_분류_없이_저장할_수_없다() {
        UUID placeId = UUID.randomUUID();
        UUID recordId = UUID.randomUUID();
        truncate("restaurant_places");
        jdbc.update(
                """
                INSERT INTO restaurant_places (place_id, provider_place_id, place_name, category, address, latitude, longitude)
                VALUES (?, '1001', '국밥집', '한식', '서울 중구 을지로 1', 37.566, 126.991)
                """,
                placeId);
        jdbc.update(
                """
                INSERT INTO restaurant_records (record_id, place_id, account_id, author_name, reason, visibility)
                VALUES (?, ?, ?, '맛객', '국물이 진하고 맛있어요.', 'PUBLIC')
                """,
                recordId,
                placeId,
                ME);

        assertThatThrownBy(() -> jdbc.update(
                        "INSERT INTO restaurant_record_tags (record_id, tag_name) VALUES (?, '국물이 진한')", recordId))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
