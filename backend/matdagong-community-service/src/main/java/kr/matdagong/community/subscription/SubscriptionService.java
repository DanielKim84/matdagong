package kr.matdagong.community.subscription;

import static kr.matdagong.community.subscription.SubscriptionModels.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import kr.matdagong.common.jdbc.JdbcTimes;
import kr.matdagong.community.notification.NotificationService;
import kr.matdagong.community.profile.ProfileMediaUrls;
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
    // 오픈 전 무료 이용 기간에도 유료 플랜의 기간별 테스트 안내 금액은 화면에 표시합니다.
    private static final Map<Integer, BigDecimal> TEST_PRICES = Map.of(
            1, new BigDecimal("1000"),
            3, new BigDecimal("2700"),
            6, new BigDecimal("5000"),
            12, new BigDecimal("9000"));

    private final JdbcTemplate jdbc;
    private final NotificationService notifications;

    public SubscriptionService(JdbcTemplate jdbc, NotificationService notifications) {
        this.jdbc = jdbc;
        this.notifications = notifications;
    }

    public PlanCatalog plans() {
        List<PaidPlan> paidPlans = TEST_PRICES.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new PaidPlan(entry.getKey(), entry.getValue()))
                .toList();
        return new PlanCatalog("KRW", true, BigDecimal.ZERO, paidPlans);
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

    @Transactional
    public SubscribeResult subscribe(UUID subscriberId, SubscribeRequest request) {
        expireEndedSubscriptions();
        UUID targetId = request.targetAccountId();
        if (subscriberId.equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 프로필은 구독할 수 없습니다.");
        }
        String targetNickname = nickname(targetId);
        if (targetNickname == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "구독할 맛객을 찾을 수 없습니다.");
        }
        String subscriberNickname = nickname(subscriberId);

        boolean isFree = request.subscriptionType() == SubscriptionType.FREE;
        // 무료 구독 교체 요청을 한 계정씩 처리해 동시에 신청해도 무료 자리가 둘 생기지 않게 합니다.
        if (isFree) {
            jdbc.queryForList("SELECT account_id FROM user_profiles WHERE account_id = ? FOR UPDATE", subscriberId);
        }
        Integer termMonths = validatedTerm(request);
        // 결제 연동 전에는 유료 플랜도 무료 제공하며, 요금표는 화면 안내용으로만 유지합니다.
        BigDecimal price = BigDecimal.ZERO;

        UUID existingId = jdbc
                .query(
                        "SELECT subscription_id FROM user_subscriptions WHERE subscriber_id = ? AND target_account_id = ?",
                        (rs, row) -> rs.getObject("subscription_id", UUID.class),
                        subscriberId,
                        targetId)
                .stream()
                .findFirst()
                .orElse(null);
        if (existingId != null && isActive(existingId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 구독 중인 맛객입니다.");
        }

        String replacedNickname = isFree ? replaceFreeSubscription(subscriberId, request) : null;
        UUID subscriptionId = existingId == null
                ? insertSubscription(subscriberId, targetId, request.subscriptionType())
                : reactivate(existingId, request.subscriptionType());

        Instant start = Instant.now().truncatedTo(ChronoUnit.MICROS);
        // 유료 플랜의 무료 제공 기간에는 선택한 이용 기간만 기록하고 실제 청구는 하지 않습니다.
        Instant end = isFree
                ? null
                : start.atZone(ZoneOffset.UTC).plusMonths(termMonths).toInstant();
        UUID historyId = UUID.randomUUID();
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
                price,
                start.atOffset(ZoneOffset.UTC),
                end == null ? null : end.atOffset(ZoneOffset.UTC));

        notifications.newSubscriber(
                targetId, subscriberId, subscriberNickname == null ? "새 사용자" : subscriberNickname, historyId);

        SubscriptionView view = new SubscriptionView(
                subscriptionId, targetId, targetNickname, request.subscriptionType(), termMonths, start, end);
        return new SubscribeResult(view, replacedNickname);
    }

    /** 만료 시각이 지난 유료 회차를 비활성화해 다시 신청할 수 있게 합니다. 맛객 목록의 구독자 수도 이 정리 뒤에 셉니다. */
    @Transactional
    public void expireEndedSubscriptions() {
        jdbc.update(
                """
                UPDATE user_subscription_history
                SET period_st = 'EXPIRED'
                WHERE period_st = 'ACTIVE' AND end_dt IS NOT NULL AND end_dt <= now()
                """);
        jdbc.update(
                """
                UPDATE user_subscriptions s
                SET subscription_st = 'INACTIVE', upd_dt = now()
                WHERE s.subscription_st = 'ACTIVE'
                  AND NOT EXISTS (
                      SELECT 1 FROM user_subscription_history period
                      WHERE period.subscription_id = s.subscription_id AND period.period_st = 'ACTIVE'
                  )
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

    private UUID insertSubscription(UUID subscriberId, UUID targetId, SubscriptionType type) {
        UUID subscriptionId = UUID.randomUUID();
        jdbc.update(
                """
                INSERT INTO user_subscriptions (
                    subscription_id, subscriber_id, target_account_id,
                    subscription_st, subscription_type
                ) VALUES (?, ?, ?, 'ACTIVE', ?)
                """,
                subscriptionId,
                subscriberId,
                targetId,
                type.name());
        return subscriptionId;
    }

    private UUID reactivate(UUID subscriptionId, SubscriptionType type) {
        jdbc.update(
                """
                UPDATE user_subscriptions
                SET subscription_st = 'ACTIVE', subscription_type = ?, upd_dt = now()
                WHERE subscription_id = ?
                """,
                type.name(),
                subscriptionId);
        return subscriptionId;
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

    private boolean isActive(UUID subscriptionId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM user_subscriptions WHERE subscription_id = ? AND subscription_st = 'ACTIVE'
                )
                """,
                Boolean.class,
                subscriptionId));
    }

    private String nickname(UUID accountId) {
        return jdbc
                .query(
                        "SELECT nickname FROM user_profiles WHERE account_id = ?",
                        (rs, row) -> rs.getString("nickname"),
                        accountId)
                .stream()
                .findFirst()
                .orElse(null);
    }

    /** 무료 구독은 기간을 고르지 않고(null), 유료 구독은 요금표에 있는 기간만 받습니다. */
    private static Integer validatedTerm(SubscribeRequest request) {
        if (request.subscriptionType() == SubscriptionType.FREE) {
            if (request.termMonths() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "무료 구독에는 기간을 선택할 수 없습니다.");
            }
            return null;
        }
        if (request.termMonths() == null || !TEST_PRICES.containsKey(request.termMonths())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유료 구독 기간은 1, 3, 6, 12개월 중 선택해 주세요.");
        }
        return request.termMonths();
    }

    private record FreeSubscription(UUID subscriptionId, UUID targetAccountId, String nickname) {}
}
