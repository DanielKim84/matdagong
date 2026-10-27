package kr.matdagong.community.subscription;

import static kr.matdagong.community.subscription.SubscriptionModels.*;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 구독 관계와 구독 회차를 한 DB 트랜잭션으로 함께 갱신합니다. */
@Service
public class SubscriptionService {
    // 실제 결제 연동 전까지 화면과 API 동작을 검증할 개발용 금액입니다.
    private static final Map<Integer, BigDecimal> TEST_PRICES = Map.of(
            1, new BigDecimal("1000"),
            3, new BigDecimal("2700"),
            6, new BigDecimal("5000"),
            12, new BigDecimal("9000"));

    private final JdbcTemplate jdbc;

    public SubscriptionService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public PlanCatalog plans() {
        List<PaidPlan> paidPlans = TEST_PRICES.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new PaidPlan(entry.getKey(), entry.getValue()))
                .toList();
        return new PlanCatalog("KRW", true, BigDecimal.ZERO, paidPlans);
    }

    @Transactional
    public List<TasterView> tasters(UUID currentAccountId) {
        expireEndedSubscriptions();
        return jdbc.query("""
                SELECT p.account_id, p.nickname, p.avatar_variant, p.taster_focus,
                       p.profile_cover_data IS NOT NULL AS has_cover,
                       p.profile_img_data IS NOT NULL AS has_avatar, p.intro,
                       COUNT(DISTINCT followers.subscription_id) AS follower_count,
                       COUNT(DISTINCT following.subscription_id) AS following_count,
                       COUNT(DISTINCT preference.tag_id) + CASE
                           WHEN MAX(my_profile.preference_focus) = 'BOTH'
                             OR p.taster_focus = 'BOTH'
                             OR MAX(my_profile.preference_focus) = p.taster_focus THEN 1
                           ELSE 0
                       END AS match_score,
                       string_agg(DISTINCT profile_tag.tag_name, ',' ORDER BY profile_tag.tag_name)
                         FILTER (WHERE profile_tag.tag_name IS NOT NULL) AS profile_tags,
                       string_agg(DISTINCT profile_tag.tag_name, ',' ORDER BY profile_tag.tag_name)
                         FILTER (WHERE preference.tag_id IS NOT NULL) AS matched_tags
                FROM user_profiles p
                LEFT JOIN user_profiles my_profile ON my_profile.account_id = ?
                LEFT JOIN user_subscriptions followers
                  ON followers.target_account_id = p.account_id AND followers.subscription_st = 'ACTIVE'
                LEFT JOIN user_subscriptions following
                  ON following.subscriber_id = p.account_id AND following.subscription_st = 'ACTIVE'
                LEFT JOIN user_profile_tags profile_tags
                  ON profile_tags.account_id = p.account_id
                LEFT JOIN taste_tags profile_tag ON profile_tag.tag_id = profile_tags.tag_id
                LEFT JOIN user_preference_tags preference
                  ON preference.account_id = my_profile.account_id
                 AND preference.preference_type = 'LIKE'
                 AND preference.tag_id = profile_tags.tag_id
                WHERE p.account_id <> ?
                GROUP BY p.account_id, p.taster_focus
                ORDER BY match_score DESC, follower_count DESC, p.nickname
                """, (rs, row) -> new TasterView(
                rs.getString("account_id"),
                rs.getString("nickname"),
                "맛객",
                rs.getBoolean("has_avatar")
                        ? "/media/profiles/%s/avatar".formatted(rs.getString("account_id")) : null,
                rs.getInt("avatar_variant"),
                rs.getBoolean("has_cover")
                        ? "/media/profiles/%s/cover".formatted(rs.getString("account_id")) : null,
                rs.getString("taster_focus"),
                "#FFE5D5",
                "맛있는 장소를 찾아 기록하고 있어요.",
                rs.getString("intro"),
                0,
                rs.getInt("follower_count"),
                rs.getInt("following_count"),
                splitTagNames(rs.getString("profile_tags")),
                splitTagNames(rs.getString("matched_tags")),
                rs.getInt("match_score")), currentAccountId, currentAccountId);
    }

    private List<String> splitTagNames(String tagNames) {
        return tagNames == null || tagNames.isBlank()
                ? List.of()
                : List.of(tagNames.split(","));
    }

    @Transactional
    public List<SubscriptionView> subscriptions(UUID subscriberId) {
        expireEndedSubscriptions();
        return jdbc.query("""
                SELECT s.subscription_id, s.target_account_id, p.nickname,
                       s.subscription_type, period.term_months, period.start_dt, period.end_dt
                FROM user_subscriptions s
                JOIN user_profiles p ON p.account_id = s.target_account_id
                JOIN user_subscription_history period
                  ON period.subscription_id = s.subscription_id AND period.period_st = 'ACTIVE'
                WHERE s.subscriber_id = ? AND s.subscription_st = 'ACTIVE'
                ORDER BY s.reg_dt DESC
                """, subscriptionRowMapper(), subscriberId);
    }

    @Transactional
    public SubscribeResult subscribe(UUID subscriberId, SubscribeRequest request) {
        expireEndedSubscriptions();
        UUID targetId = request.targetAccountId();
        if (subscriberId.equals(targetId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "자기 프로필은 구독할 수 없습니다.");
        }

        String targetNickname = jdbc.query(
                "SELECT nickname FROM user_profiles WHERE account_id = ?",
                rs -> rs.next() ? rs.getString(1) : null,
                targetId);
        if (targetNickname == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "구독할 맛객을 찾을 수 없습니다.");
        }

        int termMonths = validatePlan(request);
        BigDecimal price = request.subscriptionType() == SubscriptionType.FREE
                ? BigDecimal.ZERO
                : TEST_PRICES.get(termMonths);

        List<UUID> existingIds = jdbc.query(
                "SELECT subscription_id FROM user_subscriptions WHERE subscriber_id = ? AND target_account_id = ?",
                (rs, row) -> rs.getObject(1, UUID.class),
                subscriberId,
                targetId);
        if (!existingIds.isEmpty()) {
            Integer activeCount = jdbc.queryForObject(
                    "SELECT count(*) FROM user_subscriptions WHERE subscription_id = ? AND subscription_st = 'ACTIVE'",
                    Integer.class,
                    existingIds.get(0));
            if (activeCount != null && activeCount > 0) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 구독 중인 맛객입니다.");
            }
        }

        String replacedNickname = null;
        if (request.subscriptionType() == SubscriptionType.FREE) {
            // 무료 구독은 한 자리만 유지하므로 새 무료 구독을 만들 때 기존 회차부터 종료합니다.
            List<Map<String, Object>> previousFree = jdbc.queryForList("""
                    SELECT s.subscription_id, p.nickname
                    FROM user_subscriptions s
                    JOIN user_profiles p ON p.account_id = s.target_account_id
                    WHERE s.subscriber_id = ? AND s.subscription_st = 'ACTIVE'
                      AND s.subscription_type = 'FREE'
                    FOR UPDATE OF s
                    """, subscriberId);
            for (Map<String, Object> previous : previousFree) {
                UUID previousId = (UUID) previous.get("subscription_id");
                replacedNickname = (String) previous.get("nickname");
                jdbc.update("""
                        UPDATE user_subscription_history
                        SET period_st = 'CANCELED'
                        WHERE subscription_id = ? AND period_st = 'ACTIVE'
                        """, previousId);
                jdbc.update("""
                        UPDATE user_subscriptions
                        SET subscription_st = 'INACTIVE', upd_dt = now()
                        WHERE subscription_id = ?
                        """, previousId);
            }
        }

        UUID subscriptionId;
        if (existingIds.isEmpty()) {
            subscriptionId = UUID.randomUUID();
            jdbc.update("""
                    INSERT INTO user_subscriptions (
                        subscription_id, subscriber_id, target_account_id,
                        subscription_st, subscription_type
                    ) VALUES (?, ?, ?, 'ACTIVE', ?)
                    """, subscriptionId, subscriberId, targetId,
                    request.subscriptionType().name());
        } else {
            subscriptionId = existingIds.get(0);
            jdbc.update("""
                    UPDATE user_subscriptions
                    SET subscription_st = 'ACTIVE', subscription_type = ?, upd_dt = now()
                    WHERE subscription_id = ?
                    """, request.subscriptionType().name(), subscriptionId);
        }

        Instant start = Instant.now().truncatedTo(ChronoUnit.MICROS);
        // 결제 모형 단계에서는 PAID 요청도 결제 완료로 기록해 실제 금액 없이 구독 흐름을 시험합니다.
        Instant end = request.subscriptionType() == SubscriptionType.FREE
                ? null
                : start.atZone(ZoneOffset.UTC).plusMonths(termMonths).toInstant();
        // PostgreSQL JDBC는 Instant를 직접 바인딩하지 못하므로 Timestamp로 변환해 전달합니다.
        jdbc.update("""
                INSERT INTO user_subscription_history (
                    subscription_history_id, subscription_id, subscription_type,
                    term_months, period_st, price_amt, start_dt, end_dt
                ) VALUES (?, ?, ?, ?, 'ACTIVE', ?, ?, ?)
                """, UUID.randomUUID(), subscriptionId, request.subscriptionType().name(),
                nullableTerm(request), price, Timestamp.from(start), end == null ? null : Timestamp.from(end));

        SubscriptionView view = new SubscriptionView(
                subscriptionId, targetId, targetNickname, request.subscriptionType(),
                nullableTerm(request), start, end);
        return new SubscribeResult(view, replacedNickname);
    }

    private int validatePlan(SubscribeRequest request) {
        if (request.subscriptionType() == SubscriptionType.FREE) {
            if (request.termMonths() != null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "무료 구독에는 기간을 선택할 수 없습니다.");
            }
            return 0;
        }
        if (request.termMonths() == null || !TEST_PRICES.containsKey(request.termMonths())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "유료 구독 기간은 1, 3, 6, 12개월 중 선택해 주세요.");
        }
        return request.termMonths();
    }

    private Integer nullableTerm(SubscribeRequest request) {
        return request.subscriptionType() == SubscriptionType.FREE ? null : request.termMonths();
    }

    private RowMapper<SubscriptionView> subscriptionRowMapper() {
        return (rs, row) -> new SubscriptionView(
                rs.getObject("subscription_id", UUID.class),
                rs.getObject("target_account_id", UUID.class),
                rs.getString("nickname"),
                SubscriptionType.valueOf(rs.getString("subscription_type")),
                rs.getObject("term_months") == null ? null : rs.getInt("term_months"),
                rs.getTimestamp("start_dt").toInstant(),
                rs.getTimestamp("end_dt") == null ? null : rs.getTimestamp("end_dt").toInstant());
    }

    /** 만료 시각이 지난 유료 회차를 비활성화해 다시 신청할 수 있게 합니다. */
    private void expireEndedSubscriptions() {
        jdbc.update("""
                UPDATE user_subscription_history
                SET period_st = 'EXPIRED'
                WHERE period_st = 'ACTIVE' AND end_dt IS NOT NULL AND end_dt <= now()
                """);
        jdbc.update("""
                UPDATE user_subscriptions s
                SET subscription_st = 'INACTIVE', upd_dt = now()
                WHERE s.subscription_st = 'ACTIVE'
                  AND NOT EXISTS (
                      SELECT 1 FROM user_subscription_history period
                      WHERE period.subscription_id = s.subscription_id AND period.period_st = 'ACTIVE'
                  )
                """);
    }
}
