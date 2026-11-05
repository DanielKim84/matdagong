package kr.matdagong.community.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import java.util.List;
import java.util.UUID;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.community.notification.NotificationModels.NotificationSettings;
import kr.matdagong.community.notification.NotificationService;
import kr.matdagong.community.subscription.SubscriptionModels.SubscribeRequest;
import kr.matdagong.community.subscription.SubscriptionModels.SubscriptionType;
import kr.matdagong.community.subscription.SubscriptionService;
import kr.matdagong.community.tastetag.TasteTagModels.TagRequest;
import kr.matdagong.community.tastetag.TasteTagModels.TagRequestType;
import kr.matdagong.community.tastetag.TasteTagRequestService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;

/** 회원 탈퇴가 이 계정의 커뮤니티 데이터만 모두 지우고, 다른 맛객의 데이터는 남기는지 실제 스키마로 확인합니다. */
class WithdrawalServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID ME = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID OTHER = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final byte[] PNG = {(byte) 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00};

    private WithdrawalService withdrawals;
    private ProfileCoverService covers;
    private NotificationService notifications;
    private SubscriptionService subscriptions;

    @BeforeEach
    void setUp() {
        truncate(
                "user_profiles, user_subscriptions, user_notifications, user_notification_settings, user_point_history");
        withdrawals = new WithdrawalService(jdbc);
        covers = new ProfileCoverService(jdbc, new ProfileImageService(jdbc));
        notifications = new NotificationService(jdbc);
        subscriptions = new SubscriptionService(jdbc, notifications);
        profile(ME, "탈퇴맛객");
        profile(OTHER, "남는맛객");
    }

    @Test
    void 탈퇴하면_내_프로필과_구독_알림_포인트_요청_기록을_모두_지운다() throws Exception {
        jdbc.update("INSERT INTO user_profile_tags (account_id, tag_id) SELECT ?, tag_id FROM taste_tags LIMIT 1", ME);
        jdbc.update(
                "INSERT INTO user_preference_tags (account_id, tag_id) SELECT ?, tag_id FROM taste_tags LIMIT 1", ME);
        covers.addCovers(ME, List.of(new MockMultipartFile("files", "cover.png", "image/png", PNG)));
        new TasteTagRequestService(jdbc)
                .create(ME, new TagRequest(TagRequestType.TAG, "새 태그", TasteTagGroup.TASTE, null));
        notifications.updateSettings(ME, new NotificationSettings(false, true, false));
        jdbc.update(
                """
                INSERT INTO user_point_history (point_history_id, account_id, event_type, title, point_amt)
                VALUES (?, ?, 'EARN', '가입 축하', 100)
                """,
                UUID.randomUUID(),
                ME);
        // 구독 신청이 양쪽 구독 이력과 서로에게 가는 새 구독자 알림을 만듭니다.
        subscriptions.subscribe(ME, new SubscribeRequest(OTHER, SubscriptionType.FREE, null, false));
        subscriptions.subscribe(OTHER, new SubscribeRequest(ME, SubscriptionType.PAID, 1, false));
        jdbc.update(
                """
                INSERT INTO user_notifications (recipient_account_id, notification_type, title, message)
                VALUES (?, 'SYSTEM_NOTICE', '공지', '남아야 하는 알림')
                """,
                OTHER);

        withdrawals.withdraw(ME);

        String me = ME.toString();
        assertThat(count("SELECT count(*) FROM user_profiles WHERE account_id = ?", ME))
                .isZero();
        assertThat(count("SELECT count(*) FROM user_profile_tags WHERE account_id = ?", ME))
                .isZero();
        assertThat(count("SELECT count(*) FROM user_preference_tags WHERE account_id = ?", ME))
                .isZero();
        assertThat(count("SELECT count(*) FROM user_profile_cover_photos WHERE account_id = ?", ME))
                .isZero();
        assertThat(count("SELECT count(*) FROM taste_tag_requests WHERE account_id = ?", ME))
                .isZero();
        assertThat(count("SELECT count(*) FROM user_notification_settings WHERE account_id = ?", ME))
                .isZero();
        assertThat(count("SELECT count(*) FROM user_point_history WHERE account_id = ?", ME))
                .isZero();
        assertThat(count(
                        "SELECT count(*) FROM user_subscriptions WHERE subscriber_id = ? OR target_account_id = ?",
                        ME,
                        ME))
                .isZero();
        assertThat(count("SELECT count(*) FROM user_subscription_history")).isZero();
        assertThat(count(
                        "SELECT count(*) FROM user_notifications WHERE recipient_account_id = ? OR target_id = ?",
                        ME,
                        me))
                .isZero();
        // 다른 맛객의 프로필과 나와 관계없는 알림은 그대로 남습니다.
        assertThat(count("SELECT count(*) FROM user_profiles WHERE account_id = ?", OTHER))
                .isOne();
        assertThat(notifications.list(OTHER).items()).singleElement().satisfies(item -> assertThat(item.message())
                .isEqualTo("남아야 하는 알림"));
    }

    @Test
    void 이미_탈퇴했거나_프로필이_없는_계정도_오류_없이_끝난다() {
        withdrawals.withdraw(ME);

        assertThatCode(() -> withdrawals.withdraw(ME)).doesNotThrowAnyException();
        assertThatCode(() -> withdrawals.withdraw(UUID.randomUUID())).doesNotThrowAnyException();
        assertThat(count("SELECT count(*) FROM user_profiles WHERE account_id = ?", OTHER))
                .isOne();
    }

    private static int count(String sql, Object... args) {
        Integer value = jdbc.queryForObject(sql, Integer.class, args);
        return value == null ? 0 : value;
    }

    private static void profile(UUID accountId, String nickname) {
        jdbc.update(
                "INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, ?, 1)",
                accountId,
                nickname);
    }
}
