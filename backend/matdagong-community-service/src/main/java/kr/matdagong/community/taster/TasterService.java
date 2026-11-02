package kr.matdagong.community.taster;

import static kr.matdagong.community.taster.TasterModels.*;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import kr.matdagong.community.profile.ProfileMediaUrls;
import kr.matdagong.community.profile.ProfileModels;
import kr.matdagong.community.profile.ProfileModels.ActivityScope;
import kr.matdagong.community.profile.ProfileModels.FoodFocus;
import kr.matdagong.community.subscription.SubscriptionService;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 다른 맛객 목록을 나와의 취향 일치율, 구독자 수 순서로 보여 줍니다. */
@Service
public class TasterService {
    private final JdbcTemplate jdbc;
    private final SubscriptionService subscriptions;

    public TasterService(JdbcTemplate jdbc, SubscriptionService subscriptions) {
        this.jdbc = jdbc;
        this.subscriptions = subscriptions;
    }

    /** 구독자 수에 만료된 구독이 섞이지 않도록 만료 회차를 먼저 정리하므로 쓰기 트랜잭션으로 실행합니다. */
    @Transactional
    public List<TasterView> tasters(UUID currentAccountId) {
        subscriptions.expireEndedSubscriptions();
        return jdbc.query(
                """
                SELECT p.account_id, p.nickname, p.avatar_variant, p.taster_focus,
                       p.activity_scope, p.activity_region,
                       cover_images.photo_ids AS profile_cover_photo_ids,
                       p.profile_img_data IS NOT NULL AS has_avatar, p.intro,
                       COUNT(DISTINCT subscribers.subscription_id) AS subscriber_count,
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
                GROUP BY p.account_id, p.taster_focus, cover_images.photo_ids
                ORDER BY match_score DESC, subscriber_count DESC, p.nickname
                """,
                (rs, row) -> {
                    UUID accountId = rs.getObject("account_id", UUID.class);
                    List<String> coverUrls = coverPhotoUrls(rs.getString("profile_cover_photo_ids"), accountId);
                    return new TasterView(
                            accountId.toString(),
                            rs.getString("nickname"),
                            "맛객",
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
                            matchPercent(rs.getInt("match_score"), rs.getInt("match_total")));
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
