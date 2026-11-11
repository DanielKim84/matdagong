package kr.matdagong.community.taster;

import static kr.matdagong.community.taster.TasterModels.*;

import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import kr.matdagong.common.jdbc.JdbcArrays;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.community.profile.ProfileMediaUrls;
import kr.matdagong.community.profile.ProfileModels.ActivityScope;
import kr.matdagong.community.profile.ProfileModels.FoodFocus;
import kr.matdagong.community.profile.ProfileQueries;
import kr.matdagong.community.subscription.SubscriptionService;
import kr.matdagong.community.taster.PlaceTrustClient.TrustStats;
import kr.matdagong.community.taster.TasteMatch.MyTaste;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 다른 맛객 목록을 나와의 취향 일치율, 구독자 수 순서로 보여 주고, 같은 맛집 경험이 있으면 신뢰 %를 함께 붙입니다.
 * 취향 일치율은 SQL로 재료(내 좋아요 태그, 맛객 분야·프로필 태그)만 읽고 TasteMatch가 계산합니다.
 * 신고가 쌓여 가려진 맛객은 목록에서 뺍니다.
 */
@Service
public class TasterService {
    private final JdbcTemplate jdbc;
    private final SubscriptionService subscriptions;

    public TasterService(JdbcTemplate jdbc, SubscriptionService subscriptions) {
        this.jdbc = jdbc;
        this.subscriptions = subscriptions;
    }

    /**
     * 구독자 수에 만료된 구독이 섞이지 않도록 만료 회차를 먼저 정리하므로 쓰기 트랜잭션으로 실행합니다.
     * 배경 사진·구독자 수·프로필 태그는 맛객마다 상관 서브쿼리로 한 번에 읽습니다(맛객별 추가 조회 없음).
     *
     * @param trustStats 장소 서비스에서 받은 계정별 경험 재료. 받지 못했으면 빈 값이고 신뢰는 비워 둡니다.
     */
    @Transactional
    public List<TasterView> tasters(UUID currentAccountId, Map<UUID, TrustStats> trustStats) {
        subscriptions.expireEndedSubscriptions();
        MyTaste myTaste = myTaste(currentAccountId);
        Set<String> myLikedTags = new LinkedHashSet<>();
        myTaste.likedTags().values().forEach(myLikedTags::addAll);
        List<TasterView> views = jdbc.query(
                """
                SELECT p.account_id, p.nickname, p.avatar_variant, p.taster_focus,
                       p.activity_scope, p.activity_region, p.intro,
                       p.profile_img_data IS NOT NULL AS has_avatar, %s,
                       (SELECT count(*) FROM user_subscriptions s
                        WHERE s.target_account_id = p.account_id AND s.subscription_st = 'ACTIVE') AS subscriber_count,
                       ARRAY(
                           SELECT tag.tag_name FROM user_profile_tags selected
                           JOIN taste_tags tag ON tag.tag_id = selected.tag_id
                           WHERE selected.account_id = p.account_id ORDER BY tag.tag_name
                       ) AS profile_tags
                FROM user_profiles p
                WHERE p.account_id <> ? AND NOT %s
                ORDER BY subscriber_count DESC, p.nickname
                """
                        .formatted(ProfileQueries.COVER_PHOTO_IDS, ProfileQueries.hiddenByReports("p.account_id")),
                (rs, row) -> {
                    UUID accountId = rs.getObject("account_id", UUID.class);
                    List<String> coverUrls = ProfileQueries.coverUrls(rs, accountId);
                    FoodFocus tasterFocus = FoodFocus.valueOf(rs.getString("taster_focus"));
                    List<String> profileTags = JdbcArrays.strings(rs, "profile_tags");
                    Integer tasteMatch = TasteMatch.percent(myTaste, tasterFocus, profileTags);
                    TasteTrust.Result trust = TasteTrust.evaluate(trustStats.get(accountId), tasteMatch);
                    return new TasterView(
                            accountId.toString(),
                            rs.getString("nickname"),
                            rs.getBoolean("has_avatar") ? ProfileMediaUrls.avatar(accountId) : null,
                            rs.getInt("avatar_variant"),
                            coverUrls,
                            tasterFocus,
                            ActivityScope.valueOf(rs.getString("activity_scope")),
                            rs.getString("activity_region"),
                            rs.getString("intro"),
                            rs.getInt("subscriber_count"),
                            profileTags,
                            profileTags.stream().filter(myLikedTags::contains).toList(),
                            tasteMatch == null ? 0 : tasteMatch,
                            trust == null ? null : trust.score(),
                            trust == null ? null : trust.level());
                },
                currentAccountId);
        // SQL이 구독자 수·닉네임 순서로 읽었으므로, 안정 정렬로 일치율만 앞세우면 같은 일치율 안에서는 그 순서가 남습니다.
        return views.stream()
                .sorted(Comparator.comparingInt(TasterView::matchScore).reversed())
                .toList();
    }

    /**
     * 내 추천 분야와 분류별 좋아요 태그를 한 번에 읽습니다. 프로필이 없으면 행이 없어 분야는 BOTH, 태그는 없습니다.
     * 좋아요 태그가 없으면 프로필 한 행만 오고 태그 칼럼은 NULL입니다(LEFT JOIN).
     */
    private MyTaste myTaste(UUID accountId) {
        List<LikedTagRow> rows = jdbc.query(
                """
                SELECT p.preference_focus, tag.tag_group, tag.tag_name
                FROM user_profiles p
                LEFT JOIN user_preference_tags selected
                  ON selected.account_id = p.account_id AND selected.preference_type = 'LIKE'
                LEFT JOIN taste_tags tag ON tag.tag_id = selected.tag_id
                WHERE p.account_id = ?
                """,
                (rs, row) -> new LikedTagRow(
                        FoodFocus.valueOf(rs.getString("preference_focus")),
                        rs.getString("tag_group"),
                        rs.getString("tag_name")),
                accountId);
        Map<TasteTagGroup, Set<String>> likedTags = new EnumMap<>(TasteTagGroup.class);
        for (LikedTagRow row : rows) {
            if (row.tagGroup() == null) continue;
            likedTags
                    .computeIfAbsent(TasteTagGroup.valueOf(row.tagGroup()), group -> new LinkedHashSet<>())
                    .add(row.tagName());
        }
        return new MyTaste(rows.isEmpty() ? FoodFocus.BOTH : rows.get(0).preferenceFocus(), likedTags);
    }

    /** 내 프로필 한 행에 좋아요 태그를 붙인 조회 결과입니다. 좋아요 태그가 없으면 tagGroup·tagName이 null입니다. */
    private record LikedTagRow(FoodFocus preferenceFocus, String tagGroup, String tagName) {}
}
