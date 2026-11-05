package kr.matdagong.community.taster;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.community.notification.NotificationService;
import kr.matdagong.community.subscription.SubscriptionService;
import kr.matdagong.community.taster.PlaceTrustClient.TrustStats;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** 맛객 목록의 취향 일치율이 겹친 태그 개수가 아니라 내 취향 대비 백분율로 내려가는지 확인합니다. */
class TasterServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private TasterService service;

    @BeforeEach
    void setUp() {
        truncate("user_profiles, user_subscriptions, user_notifications");
        service = new TasterService(jdbc, new SubscriptionService(jdbc, new NotificationService(jdbc)));
    }

    @Test
    void 일치율은_내_좋아요_태그_중_겹친_비율이다() {
        UUID me = UUID.randomUUID();
        UUID taster = UUID.randomUUID();
        jdbc.update("INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '나', 1)", me);
        jdbc.update("INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '맛객', 1)", taster);
        List<Integer> tags = jdbc.queryForList("SELECT tag_id FROM taste_tags ORDER BY tag_id LIMIT 5", Integer.class);
        // 나는 4개를 좋아요(분야는 BOTH라 분모에 더하지 않음), 1개는 피하기로 고릅니다.
        for (int i = 0; i < 4; i++) {
            jdbc.update("INSERT INTO user_preference_tags (account_id, tag_id) VALUES (?, ?)", me, tags.get(i));
        }
        jdbc.update(
                "INSERT INTO user_preference_tags (account_id, tag_id, preference_type) VALUES (?, ?, 'AVOID')",
                me,
                tags.get(4));
        // 맛객 프로필 태그 중 내 좋아요와 겹치는 것은 2개입니다.
        jdbc.update("INSERT INTO user_profile_tags (account_id, tag_id) VALUES (?, ?)", taster, tags.get(0));
        jdbc.update("INSERT INTO user_profile_tags (account_id, tag_id) VALUES (?, ?)", taster, tags.get(1));
        jdbc.update("INSERT INTO user_profile_tags (account_id, tag_id) VALUES (?, ?)", taster, tags.get(4));

        TasterModels.TasterView view = viewOf(service.tasters(me, Map.of()), taster);

        assertThat(view.matchScore()).isEqualTo(50);
        assertThat(view.matchedTags()).hasSize(2);
        assertThat(view.trustScore()).isNull();
        assertThat(view.trustLevel()).isNull();
    }

    @Test
    void 같은_맛집_경험이_있으면_취향_일치와_합쳐_신뢰를_붙인다() {
        UUID me = UUID.randomUUID();
        UUID taster = UUID.randomUUID();
        jdbc.update("INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '나', 1)", me);
        jdbc.update("INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, '맛객', 1)", taster);
        Integer tag = jdbc.queryForObject("SELECT tag_id FROM taste_tags ORDER BY tag_id LIMIT 1", Integer.class);
        jdbc.update("INSERT INTO user_preference_tags (account_id, tag_id) VALUES (?, ?)", me, tag);
        jdbc.update("INSERT INTO user_profile_tags (account_id, tag_id) VALUES (?, ?)", taster, tag);

        TasterModels.TasterView view =
                viewOf(service.tasters(me, Map.of(taster, new TrustStats(taster.toString(), 10, 0, 100))), taster);

        assertThat(view.matchScore()).isEqualTo(100);
        assertThat(view.trustScore()).isEqualTo(100);
        assertThat(view.trustLevel()).isEqualTo(TasterModels.TrustLevel.TRUSTED);
    }

    private static TasterModels.TasterView viewOf(List<TasterModels.TasterView> views, UUID taster) {
        return views.stream()
                .filter(item -> item.tasterId().equals(taster.toString()))
                .findFirst()
                .orElseThrow();
    }

    @Test
    void 내_취향이_없으면_일치율은_0이다() {
        assertThat(TasterService.matchPercent(0, 0)).isZero();
        assertThat(TasterService.matchPercent(3, 3)).isEqualTo(100);
        assertThat(TasterService.matchPercent(1, 3)).isEqualTo(33);
    }
}
