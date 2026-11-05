package kr.matdagong.community.taster;

import static kr.matdagong.community.taster.TasterModels.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import kr.matdagong.community.profile.ProfileMediaUrls;
import kr.matdagong.community.profile.ProfileModels;
import kr.matdagong.community.profile.ProfileModels.ActivityScope;
import kr.matdagong.community.profile.ProfileModels.FoodFocus;
import kr.matdagong.community.subscription.SubscriptionService;
import kr.matdagong.community.taster.PlaceTrustClient.TrustStats;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 다른 맛객 목록을 나와의 취향 일치율, 구독자 수 순서로 보여 주고, 같은 맛집 경험이 있으면 신뢰 %를 함께 붙입니다.
 * 신고가 쌓여 가려진 맛객은 목록에서 뺍니다.
 */
@Service
public class TasterService {
    /** 목록 카드의 기본 꼬리표입니다. 화면은 프로필 태그가 있으면 그 태그를 대신 보여 줍니다. */
    private static final String TASTER_TAG = "맛객";

    private final JdbcTemplate jdbc;
    private final SubscriptionService subscriptions;

    public TasterService(JdbcTemplate jdbc, SubscriptionService subscriptions) {
        this.jdbc = jdbc;
        this.subscriptions = subscriptions;
    }

    /**
     * 구독자 수에 만료된 구독이 섞이지 않도록 만료 회차를 먼저 정리하므로 쓰기 트랜잭션으로 실행합니다.
     *
     * @param trustStats 장소 서비스에서 받은 계정별 경험 재료. 받지 못했으면 빈 값이고 신뢰는 비워 둡니다.
     */
    @Transactional
    public List<TasterView> tasters(UUID currentAccountId, Map<UUID, TrustStats> trustStats) {
        subscriptions.expireEndedSubscriptions();
        return jdbc.query(
                """
                SELECT p.account_id, p.nickname, p.avatar_variant, p.taster_focus,
                       p.activity_scope, p.activity_region,
                       cover_images.photo_ids AS profile_cover_photo_ids,
                       p.profile_img_data IS NOT NULL AS has_avatar, p.intro,
                       COUNT(DISTINCT subscribers.subscription_id) AS subscriber_count,
                       -- 일치율의 분자: 겹친 좋아요 태그 수 + 내가 정한 분야를 이 맛객이 소개하면 1
                       COUNT(DISTINCT preference.tag_id) + CASE
                           WHEN MAX(my_profile.preference_focus) <> 'BOTH'
                             AND (p.taster_focus = 'BOTH'
                               OR MAX(my_profile.preference_focus) = p.taster_focus) THEN 1
                           ELSE 0
                       END AS match_score,
                       -- 일치율의 분모: 내가 좋아요로 고른 태그 수 + 분야를 정했으면 1
                       MAX(my_likes.like_count) + CASE WHEN MAX(my_profile.preference_focus) <> 'BOTH' THEN 1 ELSE 0 END AS match_total,
                       string_agg(DISTINCT profile_tag.tag_name, ',' ORDER BY profile_tag.tag_name)
                         FILTER (WHERE profile_tag.tag_name IS NOT NULL) AS profile_tags,
                       string_agg(DISTINCT profile_tag.tag_name, ',' ORDER BY profile_tag.tag_name)
                         FILTER (WHERE preference.tag_id IS NOT NULL) AS matched_tags
                FROM user_profiles p
                LEFT JOIN user_profiles my_profile ON my_profile.account_id = ?
                LEFT JOIN LATERAL (
                    SELECT string_agg(photo_id::text, ',' ORDER BY sort_no) AS photo_ids
                    FROM user_profile_cover_photos WHERE account_id = p.account_id
                ) cover_images ON true
                LEFT JOIN LATERAL (
                    SELECT count(*) AS like_count FROM user_preference_tags
                    WHERE account_id = my_profile.account_id AND preference_type = 'LIKE'
                ) my_likes ON true
                LEFT JOIN user_subscriptions subscribers
                  ON subscribers.target_account_id = p.account_id AND subscribers.subscription_st = 'ACTIVE'
                LEFT JOIN user_profile_tags profile_tags
                  ON profile_tags.account_id = p.account_id
                LEFT JOIN taste_tags profile_tag ON profile_tag.tag_id = profile_tags.tag_id
                LEFT JOIN user_preference_tags preference
                  ON preference.account_id = my_profile.account_id
                 AND preference.preference_type = 'LIKE'
                 AND preference.tag_id = profile_tags.tag_id
                WHERE p.account_id <> ?
                  AND NOT EXISTS (
                      SELECT 1 FROM taster_moderations m WHERE m.account_id = p.account_id AND m.hidden_at IS NOT NULL
                  )
                GROUP BY p.account_id, p.taster_focus, cover_images.photo_ids
                ORDER BY match_score DESC, subscriber_count DESC, p.nickname
                """,
                (rs, row) -> {
                    UUID accountId = rs.getObject("account_id", UUID.class);
                    List<String> coverUrls = coverPhotoUrls(rs.getString("profile_cover_photo_ids"), accountId);
                    int matchTotal = rs.getInt("match_total");
                    int matchScore = matchPercent(rs.getInt("match_score"), matchTotal);
                    TasteTrust.Result trust =
                            TasteTrust.evaluate(trustStats.get(accountId), matchTotal > 0 ? matchScore : null);
                    return new TasterView(
                            accountId.toString(),
                            rs.getString("nickname"),
                            TASTER_TAG,
                            rs.getBoolean("has_avatar") ? ProfileMediaUrls.avatar(accountId) : null,
                            rs.getInt("avatar_variant"),
                            ProfileMediaUrls.representativeCover(coverUrls),
                            coverUrls,
                            FoodFocus.valueOf(rs.getString("taster_focus")),
                            ActivityScope.valueOf(rs.getString("activity_scope")),
                            rs.getString("activity_region"),
                            ProfileModels.DEFAULT_INTRO,
                            rs.getString("intro"),
                            rs.getInt("subscriber_count"),
                            splitTagNames(rs.getString("profile_tags")),
                            splitTagNames(rs.getString("matched_tags")),
                            matchScore,
                            trust == null ? null : trust.score(),
                            trust == null ? null : trust.level());
                },
                currentAccountId,
                currentAccountId);
    }

    /** 겹친 취향 수를 내 취향 수에 대한 백분율(0~100)로 바꿉니다. 내 취향이 없으면 0입니다. */
    static int matchPercent(int matched, int total) {
        if (total <= 0 || matched <= 0) return 0;
        return Math.min(100, (int) Math.round(matched * 100.0 / total));
    }

    private static List<String> splitTagNames(String tagNames) {
        return tagNames == null || tagNames.isBlank() ? List.of() : List.of(tagNames.split(","));
    }

    /** 배경 사진 ID는 SQL에서 순서대로 쉼표로 이어 받아 주소 목록으로 바꿉니다. */
    private static List<String> coverPhotoUrls(String photoIds, UUID accountId) {
        if (photoIds == null || photoIds.isBlank()) return List.of();
        return Arrays.stream(photoIds.split(","))
                .map(photoId -> ProfileMediaUrls.coverPhoto(accountId, UUID.fromString(photoId)))
                .toList();
    }
}
