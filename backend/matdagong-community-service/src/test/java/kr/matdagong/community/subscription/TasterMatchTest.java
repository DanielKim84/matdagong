package kr.matdagong.community.subscription;

import static org.assertj.core.api.Assertions.assertThat;

import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.util.List;
import java.util.UUID;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

/** 맛객 목록의 취향 일치율이 겹친 태그 개수가 아니라 내 취향 대비 백분율로 내려가는지 확인합니다. */
class TasterMatchTest {
    @Test
    void 일치율은_내_좋아요_태그_중_겹친_비율이다() throws Exception {
        try (EmbeddedPostgres postgres = EmbeddedPostgres.start()) {
            DataSource dataSource = postgres.getPostgresDatabase();
            JdbcTemplate jdbc = new JdbcTemplate(dataSource);
            Flyway.configure().dataSource(dataSource).locations("classpath:db/migration").load().migrate();

            UUID me = UUID.randomUUID();
            UUID taster = UUID.randomUUID();
            jdbc.update("INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '나', 1)", me);
            jdbc.update("INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '맛객', 1)", taster);
            List<Integer> tags = jdbc.queryForList("SELECT tag_id FROM taste_tags ORDER BY tag_id LIMIT 5", Integer.class);
            // 나는 4개를 좋아요(분야는 BOTH라 분모에 더하지 않음), 1개는 피하기로 고릅니다.
            for (int i = 0; i < 4; i++) {
                jdbc.update("INSERT INTO user_preference_tags (account_id, tag_id) VALUES (?, ?)", me, tags.get(i));
            }
            jdbc.update("INSERT INTO user_preference_tags (account_id, tag_id, preference_type) VALUES (?, ?, 'AVOID')", me, tags.get(4));
            // 맛객 프로필 태그 중 내 좋아요와 겹치는 것은 2개입니다.
            jdbc.update("INSERT INTO user_profile_tags (account_id, tag_id) VALUES (?, ?)", taster, tags.get(0));
            jdbc.update("INSERT INTO user_profile_tags (account_id, tag_id) VALUES (?, ?)", taster, tags.get(1));
            jdbc.update("INSERT INTO user_profile_tags (account_id, tag_id) VALUES (?, ?)", taster, tags.get(4));

            SubscriptionModels.TasterView view = new SubscriptionService(jdbc, null).tasters(me).stream()
                    .filter(item -> item.tasterId().equals(taster.toString()))
                    .findFirst().orElseThrow();

            assertThat(view.matchScore()).isEqualTo(50);
            assertThat(view.matchedTags()).hasSize(2);
        }
    }

    @Test
    void 내_취향이_없으면_일치율은_0이다() {
        assertThat(SubscriptionService.matchPercent(0, 0)).isZero();
        assertThat(SubscriptionService.matchPercent(3, 3)).isEqualTo(100);
        assertThat(SubscriptionService.matchPercent(1, 3)).isEqualTo(33);
    }
}
