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

/** 맛객 목록이 DB의 태그 재료로 분류별 취향 일치율을 계산하고, 일치율 순서로 정렬하는지 확인합니다. */
class TasterServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private TasterService service;

    @BeforeEach
    void setUp() {
        truncate("user_profiles, user_subscriptions, user_notifications");
        service = new TasterService(jdbc, new SubscriptionService(jdbc, new NotificationService(jdbc)));
    }

    @Test
    void 일치율은_맛객_분야의_분류별_겹친_비율_평균이다() {
        UUID me = profile("나", "BOTH", "BOTH");
        UUID restaurant = profile("식당맛객", "RESTAURANT", "BOTH");
        // 음식 종류 2개 중 1개, 맛·메뉴 1개 중 1개가 겹칩니다. 피하고 싶은 조건은 셈에 넣지 않습니다.
        like(me, "한식", "일식", "매콤·얼큰", "커피 맛집");
        avoid(me, "주차 불가");
        profileTags(restaurant, "한식", "매콤·얼큰", "커피 맛집");

        TasterModels.TasterView view = viewOf(service.tasters(me, Map.of()), restaurant);

        // 식당 맛객은 카페 종류를 고를 수 없는 분야라 커피 맛집은 평균에 넣지 않습니다: (1/2 + 1/1) / 2
        assertThat(view.matchScore()).isEqualTo(75);
        assertThat(view.matchedTags()).containsExactlyInAnyOrder("한식", "매콤·얼큰", "커피 맛집");
        assertThat(view.trustScore()).isNull();
        assertThat(view.trustLevel()).isNull();
    }

    @Test
    void 카페_맛객은_내_식당_태그로_깎이지_않고_일치율_순서로_앞에_온다() {
        UUID me = profile("나", "BOTH", "BOTH");
        UUID cafe = profile("카페맛객", "CAFE_DESSERT", "BOTH");
        UUID restaurant = profile("식당맛객", "RESTAURANT", "BOTH");
        like(me, "한식", "일식", "커피 맛집");
        profileTags(cafe, "커피 맛집");
        profileTags(restaurant, "한식");

        List<TasterModels.TasterView> views = service.tasters(me, Map.of());

        assertThat(viewOf(views, cafe).matchScore()).isEqualTo(100);
        assertThat(viewOf(views, restaurant).matchScore()).isEqualTo(50);
        assertThat(views)
                .extracting(TasterModels.TasterView::tasterId)
                .containsExactly(cafe.toString(), restaurant.toString());
    }

    @Test
    void 같은_맛집_경험이_있으면_취향_일치와_합쳐_신뢰를_붙인다() {
        UUID me = profile("나", "BOTH", "BOTH");
        UUID taster = profile("맛객", "BOTH", "BOTH");
        like(me, "한식");
        profileTags(taster, "한식");

        TasterModels.TasterView view =
                viewOf(service.tasters(me, Map.of(taster, new TrustStats(taster.toString(), 10, 0, 100))), taster);

        assertThat(view.matchScore()).isEqualTo(100);
        assertThat(view.trustScore()).isEqualTo(100);
        assertThat(view.trustLevel()).isEqualTo(TasterModels.TrustLevel.TRUSTED);
    }

    @Test
    void 비교할_취향이_없으면_일치율은_0이고_신뢰는_경험만으로_낸다() {
        UUID me = profile("나", "BOTH", "BOTH");
        UUID taster = profile("맛객", "BOTH", "BOTH");
        profileTags(taster, "한식");

        TasterModels.TasterView view =
                viewOf(service.tasters(me, Map.of(taster, new TrustStats(taster.toString(), 10, 0, null))), taster);

        assertThat(view.matchScore()).isZero();
        assertThat(view.trustScore()).isEqualTo(100);
    }

    @Test
    void 쉼표가_든_태그_이름도_나뉘지_않고_프로필이_없으면_일치율은_0이다() {
        jdbc.update("INSERT INTO taste_tags (tag_name, tag_group, sort_order) VALUES ('국밥, 순대', 'CUISINE', 199)");
        UUID me = profile("나", "BOTH", "BOTH");
        UUID taster = profile("맛객", "BOTH", "BOTH");
        like(me, "국밥, 순대");
        profileTags(taster, "국밥, 순대", "한식");

        TasterModels.TasterView view = viewOf(service.tasters(me, Map.of()), taster);
        TasterModels.TasterView withoutProfile = viewOf(service.tasters(UUID.randomUUID(), Map.of()), taster);

        // 프로필 태그는 내 프로필 화면과 같은 태그 사전 순서(sort_order)입니다.
        assertThat(view.profileTags()).containsExactly("한식", "국밥, 순대");
        assertThat(view.matchedTags()).containsExactly("국밥, 순대");
        assertThat(view.matchScore()).isEqualTo(100);
        assertThat(withoutProfile.matchScore()).isZero();
        assertThat(withoutProfile.matchedTags()).isEmpty();
    }

    private static UUID profile(String nickname, String tasterFocus, String preferenceFocus) {
        UUID accountId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO user_profiles (account_id, nickname, avatar_variant, taster_focus, preference_focus)
                VALUES (?, ?, 1, ?, ?)
                """,
                accountId,
                nickname,
                tasterFocus,
                preferenceFocus);
        return accountId;
    }

    private static void like(UUID accountId, String... tagNames) {
        preferences(accountId, "LIKE", tagNames);
    }

    private static void avoid(UUID accountId, String... tagNames) {
        preferences(accountId, "AVOID", tagNames);
    }

    private static void preferences(UUID accountId, String type, String... tagNames) {
        for (String name : tagNames) {
            jdbc.update(
                    """
                    INSERT INTO user_preference_tags (account_id, tag_id, preference_type)
                    SELECT ?, tag_id, ? FROM taste_tags WHERE tag_name = ?
                    """,
                    accountId,
                    type,
                    name);
        }
    }

    private static void profileTags(UUID accountId, String... tagNames) {
        for (String name : tagNames) {
            jdbc.update(
                    "INSERT INTO user_profile_tags (account_id, tag_id) SELECT ?, tag_id FROM taste_tags WHERE tag_name = ?",
                    accountId,
                    name);
        }
    }

    private static TasterModels.TasterView viewOf(List<TasterModels.TasterView> views, UUID taster) {
        return views.stream()
                .filter(item -> item.tasterId().equals(taster.toString()))
                .findFirst()
                .orElseThrow();
    }
}
