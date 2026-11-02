package kr.matdagong.community.profile;

import static kr.matdagong.community.profile.ProfileModels.*;

import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.common.web.ApiErrors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 로그인한 계정의 맛다공 프로필과 공개용 프로필 태그·추천용 취향 태그를 저장·조회합니다. */
@Service
public class UserProfileService {
    private static final int MAX_STORED_NICKNAME_LENGTH = 30;
    private static final int MAX_REGION_LENGTH = 50;
    private static final int MAX_TAGS_PER_GROUP = 5;
    private static final int AVATAR_VARIANT_COUNT = 10;

    private final JdbcTemplate jdbc;
    private final ProfileCoverService covers;

    public UserProfileService(JdbcTemplate jdbc, ProfileCoverService covers) {
        this.jdbc = jdbc;
        this.covers = covers;
    }

    /** 공통 계정 ID로 프로필이 이미 있으면 사용자가 맛다공에서 정한 닉네임을 덮어쓰지 않고 그대로 돌려줍니다. */
    @Transactional
    public ProfileView ensureProfile(UUID accountId, String requestedNickname) {
        String nickname = uniqueNickname(accountId, requestedNickname.trim());
        jdbc.update(
                """
                INSERT INTO user_profiles (account_id, nickname, avatar_variant, intro)
                VALUES (?, ?, ?, ?)
                ON CONFLICT (account_id) DO NOTHING
                """,
                accountId,
                nickname,
                ThreadLocalRandom.current().nextInt(1, AVATAR_VARIANT_COUNT + 1),
                DEFAULT_INTRO);
        return findProfile(accountId).orElseThrow();
    }

    @Transactional(readOnly = true)
    public Optional<ProfileView> findProfile(UUID accountId) {
        return jdbc
                .query(
                        """
                        SELECT account_id, nickname, profile_img_data IS NOT NULL AS has_avatar,
                               avatar_variant, taster_focus, preference_focus, activity_scope, activity_region, intro
                        FROM user_profiles
                        WHERE account_id = ?
                        """,
                        (rs, row) -> new ProfileRow(
                                rs.getObject("account_id", UUID.class),
                                rs.getString("nickname"),
                                rs.getBoolean("has_avatar"),
                                rs.getInt("avatar_variant"),
                                FoodFocus.valueOf(rs.getString("taster_focus")),
                                FoodFocus.valueOf(rs.getString("preference_focus")),
                                ActivityScope.valueOf(rs.getString("activity_scope")),
                                rs.getString("activity_region"),
                                rs.getString("intro")),
                        accountId)
                .stream()
                .findFirst()
                .map(this::toView);
    }

    /** 프로필과 두 종류의 태그를 함께 저장합니다. 검증 실패 시 모든 변경을 되돌립니다. */
    @Transactional
    public ProfileView updateProfile(UUID accountId, UpdateProfileRequest request) {
        String nickname = request.nickname().trim();
        if (isNicknameTaken(nickname, accountId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임이에요.");
        }
        String intro = request.intro() == null || request.intro().isBlank()
                ? null
                : request.intro().trim();
        FoodFocus tasterFocus = request.tasterFocus() == null ? FoodFocus.BOTH : request.tasterFocus();
        FoodFocus preferenceFocus = request.preferenceFocus() == null ? FoodFocus.BOTH : request.preferenceFocus();
        ActivityScope activityScope = request.activityScope() == null ? ActivityScope.LOCAL : request.activityScope();
        int updated = jdbc.update(
                """
                UPDATE user_profiles
                SET nickname = ?, intro = ?, taster_focus = ?, preference_focus = ?,
                    activity_scope = ?, activity_region = ?, upd_dt = now()
                WHERE account_id = ?
                """,
                nickname,
                intro,
                tasterFocus.name(),
                preferenceFocus.name(),
                activityScope.name(),
                regionName(request.activityRegion(), activityScope),
                accountId);
        if (updated == 0) throw ApiErrors.profileRequired();
        // 프로필 태그는 공개용, 선호 태그는 추천 전용이므로 각 관계를 독립적으로 교체합니다.
        replaceProfileTags(accountId, request.profileTags(), tasterFocus);
        replacePreferences(accountId, request.preferenceTags(), request.excludedTags(), preferenceFocus);
        return findProfile(accountId).orElseThrow();
    }

    private ProfileView toView(ProfileRow profile) {
        UUID accountId = profile.accountId();
        List<String> coverUrls = covers.coverPhotoUrls(accountId);
        return new ProfileView(
                accountId,
                profile.nickname(),
                profile.hasAvatar() ? ProfileMediaUrls.avatar(accountId) : null,
                profile.avatarVariant(),
                ProfileMediaUrls.representativeCover(coverUrls),
                coverUrls,
                profile.tasterFocus(),
                profile.preferenceFocus(),
                profile.activityScope(),
                profile.activityRegion(),
                profile.intro(),
                profileTagNames(accountId),
                preferenceTagNames(accountId, PreferenceType.LIKE),
                preferenceTagNames(accountId, PreferenceType.AVOID));
    }

    private List<String> profileTagNames(UUID accountId) {
        return jdbc.query(
                """
                SELECT tag.tag_name
                FROM user_profile_tags selected
                JOIN taste_tags tag ON tag.tag_id = selected.tag_id
                WHERE selected.account_id = ?
                ORDER BY tag.sort_order
                """,
                (rs, row) -> rs.getString("tag_name"),
                accountId);
    }

    private List<String> preferenceTagNames(UUID accountId, PreferenceType type) {
        return jdbc.query(
                """
                SELECT tag.tag_name
                FROM user_preference_tags selected
                JOIN taste_tags tag ON tag.tag_id = selected.tag_id
                WHERE selected.account_id = ? AND selected.preference_type = ?
                ORDER BY tag.sort_order
                """,
                (rs, row) -> rs.getString("tag_name"),
                accountId,
                type.name());
    }

    private void replaceProfileTags(UUID accountId, List<String> requestedTags, FoodFocus focus) {
        List<String> tagNames = cleanTagNames(requestedTags);
        validateTagNames(tagNames, focus.allowedGroups());

        jdbc.update("DELETE FROM user_profile_tags WHERE account_id = ?", accountId);
        for (String name : tagNames) {
            jdbc.update(
                    """
                    INSERT INTO user_profile_tags (account_id, tag_id)
                    SELECT ?, tag_id FROM taste_tags WHERE tag_name = ?
                    """,
                    accountId,
                    name);
        }
    }

    private void replacePreferences(UUID accountId, List<String> liked, List<String> excluded, FoodFocus focus) {
        List<String> likedTags = cleanTagNames(liked);
        List<String> excludedTags = cleanTagNames(excluded);
        if (likedTags.stream().anyMatch(excludedTags::contains)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "같은 태그를 선호와 제외에 함께 등록할 수 없어요.");
        }
        validateTagNames(likedTags, focus.allowedGroups());
        // 제외는 방문 조건(웨이팅·주차 등)만 고를 수 있습니다.
        validateTagNames(excludedTags, Set.of(TasteTagGroup.VISIT));

        jdbc.update("DELETE FROM user_preference_tags WHERE account_id = ?", accountId);
        insertPreferenceTags(accountId, likedTags, PreferenceType.LIKE);
        insertPreferenceTags(accountId, excludedTags, PreferenceType.AVOID);
    }

    private void insertPreferenceTags(UUID accountId, List<String> tagNames, PreferenceType type) {
        for (String name : tagNames) {
            jdbc.update(
                    """
                    INSERT INTO user_preference_tags (account_id, tag_id, preference_type)
                    SELECT ?, tag_id, ? FROM taste_tags WHERE tag_name = ?
                    """,
                    accountId,
                    type.name(),
                    name);
        }
    }

    private static List<String> cleanTagNames(List<String> requestedTags) {
        return requestedTags == null
                ? List.of()
                : List.copyOf(new LinkedHashSet<>(requestedTags.stream()
                        .filter(name -> name != null && !name.isBlank())
                        .map(String::trim)
                        .toList()));
    }

    /** 모든 태그가 태그 사전에 있고 허용된 그룹이며, 그룹마다 5개 이하인지 확인합니다. */
    private void validateTagNames(List<String> tagNames, Set<TasteTagGroup> allowedGroups) {
        if (tagNames.isEmpty()) return;
        List<TasteTagGroup> groups = jdbc.query(
                "SELECT tag_group FROM taste_tags WHERE tag_name = ANY(?::text[])",
                (rs, row) -> TasteTagGroup.valueOf(rs.getString("tag_group")),
                (Object) tagNames.toArray(String[]::new));
        if (groups.size() != tagNames.size() || !allowedGroups.containsAll(groups)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "목록에 있는 취향 태그만 선택해 주세요.");
        }
        Map<TasteTagGroup, Integer> counts = new EnumMap<>(TasteTagGroup.class);
        groups.forEach(group -> counts.merge(group, 1, Integer::sum));
        if (counts.values().stream().anyMatch(count -> count > MAX_TAGS_PER_GROUP)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "태그 분류별로 최대 5개까지 선택할 수 있어요.");
        }
    }

    /** 다른 계정이 같은 닉네임을 쓰면 계정 ID 앞 6자리를 붙여 겹치지 않게 합니다. */
    private String uniqueNickname(UUID accountId, String requestedNickname) {
        String base = requestedNickname.isBlank() ? "맛객" : requestedNickname;
        if (base.length() > MAX_STORED_NICKNAME_LENGTH) base = base.substring(0, MAX_STORED_NICKNAME_LENGTH);
        if (!isNicknameTaken(base, accountId)) return base;

        String suffix = "-" + accountId.toString().substring(0, 6);
        int prefixLength = MAX_STORED_NICKNAME_LENGTH - suffix.length();
        return base.substring(0, Math.min(base.length(), prefixLength)) + suffix;
    }

    private boolean isNicknameTaken(String nickname, UUID accountId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE nickname = ? AND account_id <> ?)",
                Boolean.class,
                nickname,
                accountId));
    }

    private static String regionName(String region, ActivityScope activityScope) {
        if (activityScope == ActivityScope.TRAVEL || region == null || region.isBlank()) return null;
        String value = region.trim();
        return value.length() > MAX_REGION_LENGTH ? value.substring(0, MAX_REGION_LENGTH) : value;
    }

    private record ProfileRow(
            UUID accountId,
            String nickname,
            boolean hasAvatar,
            int avatarVariant,
            FoodFocus tasterFocus,
            FoodFocus preferenceFocus,
            ActivityScope activityScope,
            String activityRegion,
            String intro) {}
}
