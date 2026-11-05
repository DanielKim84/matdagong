package kr.matdagong.community.subscription;

import static kr.matdagong.community.subscription.SubscriptionModels.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import kr.matdagong.common.test.EmbeddedPostgresTestSupport;
import kr.matdagong.community.notification.NotificationModels.NotificationType;
import kr.matdagong.community.notification.NotificationService;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.server.ResponseStatusException;

/** 무료·유료 구독 신청, 무료 구독 교체, 만료 처리를 실제 스키마로 확인합니다. */
class SubscriptionServiceIntegrationTest extends EmbeddedPostgresTestSupport {
    private static final UUID ME = UUID.fromString("10000000-0000-0000-0000-000000000001");
    private static final UUID FIRST_TASTER = UUID.fromString("20000000-0000-0000-0000-000000000001");
    private static final UUID SECOND_TASTER = UUID.fromString("20000000-0000-0000-0000-000000000002");

    private NotificationService notifications;
    private SubscriptionService service;

    @BeforeEach
    void setUp() {
        truncate("user_profiles, user_subscriptions, user_notifications");
        profile(ME, "나");
        profile(FIRST_TASTER, "골목맛객");
        profile(SECOND_TASTER, "면요리맛객");
        notifications = new NotificationService(jdbc);
        service = new SubscriptionService(jdbc, notifications);
    }

    @Test
    void 무료_구독을_신청하면_현재_구독에_보이고_맛객에게_새_구독자_알림이_간다() {
        SubscribeResult result = service.subscribe(ME, free(FIRST_TASTER, false));

        assertThat(result.subscription().subscriptionType()).isEqualTo(SubscriptionType.FREE);
        assertThat(result.subscription().endAt()).isNull();
        assertThat(service.subscriptions(ME)).singleElement().satisfies(view -> assertThat(view.targetNickname())
                .isEqualTo("골목맛객"));
        assertThat(service.subscribers(FIRST_TASTER)).singleElement().satisfies(view -> {
            assertThat(view.subscriberNickname()).isEqualTo("나");
            assertThat(view.startAt()).isEqualTo(result.subscription().startAt());
        });
        assertThat(notifications.list(FIRST_TASTER).items()).singleElement().satisfies(item -> {
            assertThat(item.notificationType()).isEqualTo(NotificationType.NEW_SUBSCRIBER);
            assertThat(item.message()).isEqualTo("나님이 당신의 맛집을 구독했어요.");
        });
    }

    @Test
    void 다른_맛객으로_무료_구독을_바꾸려면_사용자_확인이_필요하다() {
        service.subscribe(ME, free(FIRST_TASTER, false));

        assertStatus(
                () -> service.subscribe(ME, free(SECOND_TASTER, false)),
                HttpStatus.CONFLICT,
                "현재 골목맛객 맛객을 무료 구독 중입니다. 기존 무료 구독 변경을 확인해 주세요.");
        SubscribeResult replaced = service.subscribe(ME, free(SECOND_TASTER, true));

        assertThat(replaced.replacedFreeNickname()).isEqualTo("골목맛객");
        assertThat(service.subscriptions(ME)).singleElement().satisfies(view -> assertThat(view.targetAccountId())
                .isEqualTo(SECOND_TASTER));
    }

    @Test
    void 기간_자기_구독_중복_신청을_한국어_문구로_거부한다() {
        assertStatus(
                () -> service.subscribe(ME, new SubscribeRequest(FIRST_TASTER, SubscriptionType.PAID, 2, false)),
                HttpStatus.BAD_REQUEST,
                "유료 구독 기간은 1, 3, 6, 12개월 중 선택해 주세요.");
        assertStatus(
                () -> service.subscribe(ME, new SubscribeRequest(FIRST_TASTER, SubscriptionType.FREE, 1, false)),
                HttpStatus.BAD_REQUEST,
                "무료 구독에는 기간을 선택할 수 없습니다.");
        assertStatus(() -> service.subscribe(ME, free(ME, false)), HttpStatus.BAD_REQUEST, "자기 프로필은 구독할 수 없습니다.");

        service.subscribe(ME, paid(FIRST_TASTER));
        assertStatus(() -> service.subscribe(ME, paid(FIRST_TASTER)), HttpStatus.CONFLICT, "이미 구독 중인 맛객입니다.");
    }

    @Test
    void 같은_맛객을_유료로_동시에_두_번_신청하면_뒤_요청은_앞_요청을_기다렸다가_409로_끝난다() {
        // 앞 요청처럼 구독자 잠금을 잡고 구독과 활성 회차를 연 채 커밋 전에 멈춰 둡니다.
        assertStatus(
                () -> callBlockedByUncommitted(
                        other -> {
                            other.queryForList(
                                    "SELECT account_id FROM user_profiles WHERE account_id = ? FOR UPDATE", ME);
                            openPaidSubscription(other, ME);
                        },
                        () -> service.subscribe(ME, paid(FIRST_TASTER))),
                HttpStatus.CONFLICT,
                "이미 구독 중인 맛객입니다.");
        assertThat(activeHistoryCount()).isEqualTo(1);
    }

    @Test
    void 잠글_프로필이_없는_구독자의_동시_신청은_활성_회차_제약에서_409로_끝난다() {
        UUID withoutProfile = UUID.fromString("10000000-0000-0000-0000-000000000009");

        assertStatus(
                () -> callBlockedByUncommitted(
                        other -> openPaidSubscription(other, withoutProfile),
                        () -> service.subscribe(withoutProfile, paid(FIRST_TASTER))),
                HttpStatus.CONFLICT,
                "이미 처리 중인 구독이에요.");
        assertThat(activeHistoryCount()).isEqualTo(1);
    }

    @Test
    void 만료된_유료_회차는_목록에서_빠지고_같은_맛객을_다시_구독할_수_있다() {
        SubscribeResult first = service.subscribe(ME, paid(FIRST_TASTER));
        jdbc.update(
                """
                UPDATE user_subscription_history
                SET start_dt = now() - INTERVAL '2 months', end_dt = now() - INTERVAL '1 minute'
                """);

        assertThat(service.subscriptions(ME)).isEmpty();
        SubscribeResult again = service.subscribe(ME, paid(FIRST_TASTER));

        assertThat(again.subscription().subscriptionId())
                .isEqualTo(first.subscription().subscriptionId());
        assertThat(service.subscriptions(ME)).hasSize(1);
    }

    @Test
    void 취소하면_구독이_끝나고_없는_구독은_404로_안내한다() {
        SubscribeResult result = service.subscribe(ME, paid(FIRST_TASTER));

        service.cancelSubscription(ME, result.subscription().subscriptionId());

        assertThat(service.subscriptions(ME)).isEmpty();
        assertStatus(
                () -> service.cancelSubscription(ME, result.subscription().subscriptionId()),
                HttpStatus.NOT_FOUND,
                "취소할 구독을 찾을 수 없습니다.");
    }

    private static SubscribeRequest free(UUID target, boolean confirmReplacement) {
        return new SubscribeRequest(target, SubscriptionType.FREE, null, confirmReplacement);
    }

    private static SubscribeRequest paid(UUID target) {
        return new SubscribeRequest(target, SubscriptionType.PAID, 1, false);
    }

    /** 다른 트랜잭션(other)에서 FIRST_TASTER 유료 구독과 그 활성 회차를 엽니다. */
    private static void openPaidSubscription(JdbcTemplate other, UUID subscriberId) {
        UUID subscriptionId = UUID.randomUUID();
        other.update(
                """
                INSERT INTO user_subscriptions (
                    subscription_id, subscriber_id, target_account_id, subscription_st, subscription_type
                ) VALUES (?, ?, ?, 'ACTIVE', 'PAID')
                """,
                subscriptionId,
                subscriberId,
                FIRST_TASTER);
        other.update(
                """
                INSERT INTO user_subscription_history (
                    subscription_history_id, subscription_id, subscription_type,
                    term_months, period_st, price_amt, start_dt, end_dt
                ) VALUES (?, ?, 'PAID', 1, 'ACTIVE', 0, now(), now() + INTERVAL '1 month')
                """,
                UUID.randomUUID(),
                subscriptionId);
    }

    private static int activeHistoryCount() {
        return jdbc.queryForObject(
                "SELECT count(*) FROM user_subscription_history WHERE period_st = 'ACTIVE'", Integer.class);
    }

    private static void profile(UUID accountId, String nickname) {
        jdbc.update(
                "INSERT INTO user_profiles (account_id, nickname, avatar_variant) VALUES (?, ?, 1)",
                accountId,
                nickname);
    }

    private static void assertStatus(ThrowingCallable call, HttpStatus status, String detail) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ResponseStatusException.class, exception -> {
            assertThat(exception.getStatusCode()).isEqualTo(status);
            assertThat(exception.getReason()).isEqualTo(detail);
        });
    }
}
