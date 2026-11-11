package kr.matdagong.community.subscription;

import static kr.matdagong.community.subscription.SubscriptionModels.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.jdbc.JdbcTimes;
import kr.matdagong.community.notification.NotificationService;
import kr.matdagong.community.profile.ProfileMediaUrls;
import kr.matdagong.community.profile.ProfileQueries;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 구독 관계(user_subscriptions)와 구독 회차(user_subscription_history)를 한 DB 트랜잭션으로 함께 갱신합니다.
 * 목록 조회도 만료된 유료 회차를 먼저 정리해야 결과가 맞으므로 쓰기 트랜잭션으로 실행합니다.
 */
@Service
public class SubscriptionService {
    /** 결제 연동 전에는 유료 플랜도 무료로 제공해 회차 금액을 0으로 남깁니다. 요금표는 화면 안내용입니다(SubscriptionPlans). */
    private static final BigDecimal PRELAUNCH_PRICE = BigDecimal.ZERO;
    /** 구독자 프로필이 없을 때 새 구독자 알림에 쓰는 이름입니다. */
    private static final String UNKNOWN_SUBSCRIBER_NAME = "새 사용자";

    private static final String SUBSCRIPTION_IN_PROGRESS = "이미 처리 중인 구독이에요.";

    private final JdbcTemplate jdbc;
    private final NotificationService notifications;

    public SubscriptionService(JdbcTemplate jdbc, NotificationService notifications) {
        this.jdbc = jdbc;
        this.notifications = notifications;
    }

    public PlanCatalog plans() {
        return SubscriptionPlans.catalog();
    }

    @Transactional
    public List<SubscriptionView> subscriptions(UUID subscriberId) {
        expireEndedSubscriptions();
        return jdbc.query(
                """
                SELECT s.subscription_id, s.target_account_id, p.nickname,
                       s.subscription_type, period.term_months, period.start_dt, period.end_dt
                FROM user_subscriptions s
                JOIN user_profiles p ON p.account_id = s.target_account_id
                JOIN user_subscription_history period
                  ON period.subscription_id = s.subscription_id AND period.period_st = 'ACTIVE'
                WHERE s.subscriber_id = ? AND s.subscription_st = 'ACTIVE'
                ORDER BY s.reg_dt DESC
                """,
                (rs, row) -> new SubscriptionView(
                        rs.getObject("subscription_id", UUID.class),
                        rs.getObject("target_account_id", UUID.class),
                        rs.getString("nickname"),
                        SubscriptionType.valueOf(rs.getString("subscription_type")),
                        rs.getObject("term_months", Integer.class),
                        JdbcTimes.instant(rs, "start_dt"),
                        JdbcTimes.instant(rs, "end_dt")),
                subscriberId);
    }

    /** 내 맛객 프로필을 구독 중인 사용자와 현재 이용 중인 구독 회차를 반환합니다. */
    @Transactional
    public List<IncomingSubscriptionView> subscribers(UUID targetAccountId) {
        expireEndedSubscriptions();
        return jdbc.query(
                """
                SELECT s.subscription_id, s.subscriber_id, p.nickname, p.avatar_variant,
                       p.profile_img_data IS NOT NULL AS has_avatar,
                       s.subscription_type, period.term_months, period.start_dt, period.end_dt
                FROM user_subscriptions s
                JOIN user_profiles p ON p.account_id = s.subscriber_id
                JOIN user_subscription_history period
                  ON period.subscription_id = s.subscription_id AND period.period_st = 'ACTIVE'
                WHERE s.target_account_id = ? AND s.subscription_st = 'ACTIVE'
                ORDER BY s.reg_dt DESC
                """,
                (rs, row) -> {
                    UUID subscriberId = rs.getObject("subscriber_id", UUID.class);
                    return new IncomingSubscriptionView(
                            rs.getObject("subscription_id", UUID.class),
                            subscriberId,
                            rs.getString("nickname"),
                            rs.getBoolean("has_avatar") ? ProfileMediaUrls.avatar(subscriberId) : null,
                            rs.getInt("avatar_variant"),
                            SubscriptionType.valueOf(rs.getString("subscription_type")),
                            rs.getObject("term_months", Integer.class),
                            JdbcTimes.instant(rs, "start_dt"),
                            JdbcTimes.instant(rs, "end_dt"));
                },
                targetAccountId);
    }

    /** 요청한 사용자의 현재 구독과 활성 회차를 함께 취소합니다. */
    @Transactional
    public void cancelSubscription(UUID subscriberId, UUID subscriptionId) {
        List<UUID> ownedActiveIds = jdbc.query(
                """
                SELECT subscription_id FROM user_subscriptions
                WHERE subscription_id = ? AND subscriber_id = ? AND subscription_st = 'ACTIVE'
                FOR UPDATE
                """,
                (rs, row) -> rs.getObject("subscription_id", UUID.class),
                subscriptionId,
                subscriberId);
        if (ownedActiveIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "취소할 구독을 찾을 수 없습니다.");
        }
        deactivate(subscriptionId);
    }

    /**
     * 구독을 신청하고 새 회차를 엽니다. 예전에 끝난 같은 맛객 구독이 있으면 그 관계 행을 다시 씁니다.
     * 무료 구독은 한 명만 둘 수 있어, 다른 맛객을 무료 구독 중이면 교체에 동의(confirmFreeReplacement)했을 때만 바꿉니다.
     */
    @Transactional
    public SubscribeResult subscribe(UUID subscriberId, SubscribeRequest request) {
        expireEndedSubscriptions();
        UUID targetId = request.targetAccountId();
        if (subscriberId.equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 프로필은 구독할 수 없습니다.");
        }
        String targetNickname = ProfileQueries.nickname(jdbc, targetId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "구독할 맛객을 찾을 수 없습니다."));
        String subscriberNickname = ProfileQueries.nickname(jdbc, subscriberId).orElse(UNKNOWN_SUBSCRIBER_NAME);

        boolean isFree = request.subscriptionType() == SubscriptionType.FREE;
        // 한 구독자의 신청을 하나씩 처리해 무료 자리가 둘 생기거나, 두 번 누른 유료 신청이 동시에 열리지 않게 합니다(뒤 요청은 409).
        ProfileQueries.lock(jdbc, subscriberId);
        Integer termMonths = SubscriptionPlans.validatedTerm(request);
        if (isSubscribed(subscriberId, targetId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 구독 중인 맛객입니다.");
        }

        String replacedNickname = isFree ? replaceFreeSubscription(subscriberId, request) : null;
        Instant start = Instant.now().truncatedTo(ChronoUnit.MICROS);
        // 유료 플랜의 무료 제공 기간에는 선택한 이용 기간만 기록하고 실제 청구는 하지 않습니다.
        Instant end = isFree
                ? null
                : start.atZone(ZoneOffset.UTC).plusMonths(termMonths).toInstant();
        UUID historyId = UUID.randomUUID();
        UUID subscriptionId;
        try {
            subscriptionId = activate(subscriberId, targetId, request.subscriptionType());
            jdbc.update(
                    """
                    INSERT INTO user_subscription_history (
                        subscription_history_id, subscription_id, subscription_type,
                        term_months, period_st, price_amt, start_dt, end_dt
                    ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
                    """,
                    historyId,
                    subscriptionId,
                    request.subscriptionType().name(),
                    termMonths,
                    PRELAUNCH_PRICE,
                    start.atOffset(ZoneOffset.UTC),
                    end == null ? null : end.atOffset(ZoneOffset.UTC));
        } catch (DuplicateKeyException exception) {
            // 프로필이 없어 위 잠금이 걸리지 않은 구독자가 동시에 신청하면, 활성 회차·무료 자리 유일 제약이 마지막으로 막습니다.
            throw new ResponseStatusException(HttpStatus.CONFLICT, SUBSCRIPTION_IN_PROGRESS);
        }

        notifications.newSubscriber(targetId, subscriberId, subscriberNickname, historyId);

        SubscriptionView view = new SubscriptionView(
                subscriptionId, targetId, targetNickname, request.subscriptionType(), termMonths, start, end);
        return new SubscribeResult(view, replacedNickname);
    }

    /**
     * 만료 시각이 지난 유료 회차를 끝내고 그 구독도 비활성화해 다시 신청할 수 있게 합니다. 맛객 목록의 구독자 수도 이 정리
     * 뒤에 셉니다. 활성 구독에는 늘 활성 회차가 하나 있으므로(신청·취소가 둘을 함께 바꿈), 이번에 끝난 회차의 구독만
     * 바꿉니다. 목록을 열 때마다 불리므로 활성 구독 전체를 훑지 않고 끝난 회차만 찾습니다(idx_subscription_history_active_end).
     */
    @Transactional
    public void expireEndedSubscriptions() {
        jdbc.update(
                """
                WITH expired AS (
                    UPDATE user_subscription_history
                    SET period_st = 'EXPIRED'
                    WHERE period_st = 'ACTIVE' AND end_dt <= now()
                    RETURNING subscription_id
                )
                UPDATE user_subscriptions s
                SET subscription_st = 'INACTIVE', upd_dt = now()
                FROM expired
                WHERE s.subscription_id = expired.subscription_id AND s.subscription_st = 'ACTIVE'
                """);
    }

    /**
     * 다른 맛객을 무료 구독 중이면, 사용자가 교체를 확인한 경우에만 그 구독을 끝냅니다.
     *
     * @return 무료 구독이 끝난 이전 맛객의 닉네임, 없으면 null
     */
    private String replaceFreeSubscription(UUID subscriberId, SubscribeRequest request) {
        List<FreeSubscription> previousFree = jdbc.query(
                """
                SELECT s.subscription_id, s.target_account_id, p.nickname
                FROM user_subscriptions s
                JOIN user_profiles p ON p.account_id = s.target_account_id
                WHERE s.subscriber_id = ? AND s.subscription_st = 'ACTIVE'
                  AND s.subscription_type = 'FREE'
                FOR UPDATE OF s
                """,
                (rs, row) -> new FreeSubscription(
                        rs.getObject("subscription_id", UUID.class),
                        rs.getObject("target_account_id", UUID.class),
                        rs.getString("nickname")),
                subscriberId);
        boolean changingFreeTaster = previousFree.stream()
                .anyMatch(previous -> !request.targetAccountId().equals(previous.targetAccountId()));
        if (changingFreeTaster && !request.confirmFreeReplacement()) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "현재 " + previousFree.get(0).nickname() + " 맛객을 무료 구독 중입니다. 기존 무료 구독 변경을 확인해 주세요.");
        }
        String replacedNickname = null;
        for (FreeSubscription previous : previousFree) {
            replacedNickname = previous.nickname();
            deactivate(previous.subscriptionId());
        }
        return replacedNickname;
    }

    /** 같은 맛객과의 관계 행은 하나(uk_user_subscriptions_pair)이므로, 예전에 끝난 구독이 있으면 그 행을 다시 켭니다. */
    private UUID activate(UUID subscriberId, UUID targetId, SubscriptionType type) {
        return jdbc.queryForObject(
                """
                INSERT INTO user_subscriptions (
                    subscription_id, subscriber_id, target_account_id, subscription_st, subscription_type
                ) VALUES (?, ?, ?, 'ACTIVE', ?)
                ON CONFLICT (subscriber_id, target_account_id) DO UPDATE SET
                    subscription_st = 'ACTIVE', subscription_type = EXCLUDED.subscription_type, upd_dt = now()
                RETURNING subscription_id
                """,
                UUID.class,
                UUID.randomUUID(),
                subscriberId,
                targetId,
                type.name());
    }

    /** 구독과 그 활성 회차를 함께 끝냅니다. 사용자 취소와 무료 구독 교체가 같은 처리를 씁니다. */
    private void deactivate(UUID subscriptionId) {
        jdbc.update(
                """
                UPDATE user_subscription_history
                SET period_st = 'CANCELED'
                WHERE subscription_id = ? AND period_st = 'ACTIVE'
                """,
                subscriptionId);
        jdbc.update(
                """
                UPDATE user_subscriptions
                SET subscription_st = 'INACTIVE', upd_dt = now()
                WHERE subscription_id = ?
                """,
                subscriptionId);
    }

    private boolean isSubscribed(UUID subscriberId, UUID targetId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM user_subscriptions
                    WHERE subscriber_id = ? AND target_account_id = ? AND subscription_st = 'ACTIVE'
                )
                """,
                Boolean.class,
                subscriberId,
                targetId));
    }

    private record FreeSubscription(UUID subscriptionId, UUID targetAccountId, String nickname) {}
}
