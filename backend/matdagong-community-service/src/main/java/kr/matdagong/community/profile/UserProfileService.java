package kr.matdagong.community.profile;

import static kr.matdagong.community.profile.ProfileModels.*;

import java.sql.Array;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.Arrays;
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
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 로그인한 계정의 맛다공 프로필과 공개용 프로필 태그·추천용 취향 태그를 저장·조회합니다. */
@Service
public class UserProfileService {
    public static final String NICKNAME_TAKEN = "이미 사용 중인 닉네임이에요.";

    private static final int MAX_REGION_LENGTH = 50;
    private static final int MAX_TAGS_PER_GROUP = 5;
    private static final int AVATAR_VARIANT_COUNT = 10;

    private final JdbcTemplate jdbc;

    public UserProfileService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * 공통 계정 ID로 프로필이 이미 있으면 사용자가 맛다공에서 정한 닉네임을 덮어쓰지 않고 그대로 돌려줍니다.
     * 닉네임은 로그인 계정 이름에서 자동으로 정하므로, 겹치면 사용자에게 묻지 않고 접미사를 바꿔 가며 다시 시도합니다.
     * ON CONFLICT DO NOTHING은 계정 ID와 닉네임 유일 제약을 모두 받아 주므로, 확인과 저장 사이에 같은 닉네임이 먼저
     * 저장되어도 오류(트랜잭션 중단) 없이 다음 후보로 넘어갑니다.
     */
    @Transactional
    public ProfileView ensureProfile(UUID accountId, String requestedNickname) {
        Optional<ProfileView> existing = findProfile(accountId);
        if (existing.isPresent()) return existing.get();
        int avatarVariant = ThreadLocalRandom.current().nextInt(1, AVATAR_VARIANT_COUNT + 1);
        for (String nickname : NicknameCandidates.of(accountId, requestedNickname.trim())) {
            int inserted = jdbc.update(
                    """
                    INSERT INTO user_profiles (account_id, nickname, avatar_variant, intro)
                    VALUES (?, ?, ?, ?)
                    ON CONFLICT DO NOTHING
                    """,
                    accountId,
                    nickname,
                    avatarVariant,
                    DEFAULT_INTRO);
            // 같은 계정의 요청이 동시에 와 다른 요청이 먼저 만들었어도 그 프로필을 돌려줍니다.
            existing = findProfile(accountId);
            if (inserted > 0 || existing.isPresent()) return existing.orElseThrow();
        }
        throw nicknameTaken();
    }

    @Transactional(readOnly = true)
    public Optional<ProfileView> findProfile(UUID accountId) {
        return jdbc
                .query(
                        """
                        SELECT p.account_id, p.nickname, p.profile_img_data IS NOT NULL AS has_avatar,
                               p.avatar_variant, p.taster_focus, p.preference_focus, p.activity_scope,
                               p.activity_region, p.intro,
                               ARRAY(
                                   SELECT c.photo_id FROM user_profile_cover_photos c
                                   WHERE c.account_id = p.account_id ORDER BY c.sort_no
                               ) AS cover_photo_ids,
                               ARRAY(
                                   SELECT tag.tag_name FROM user_profile_tags selected
                                   JOIN taste_tags tag ON tag.tag_id = selected.tag_id
                                   WHERE selected.account_id = p.account_id ORDER BY tag.sort_order
                               ) AS profile_tags,
                               ARRAY(
                                   SELECT tag.tag_name FROM user_preference_tags selected
                                   JOIN taste_tags tag ON tag.tag_id = selected.tag_id
                                   WHERE selected.account_id = p.account_id AND selected.preference_type = 'LIKE'
                                   ORDER BY tag.sort_order
                               ) AS preference_tags,
                               ARRAY(
                                   SELECT tag.tag_name FROM user_preference_tags selected
                                   JOIN taste_tags tag ON tag.tag_id = selected.tag_id
                                   WHERE selected.account_id = p.account_id AND selected.preference_type = 'AVOID'
                                   ORDER BY tag.sort_order
                               ) AS excluded_tags,
                               EXISTS (
                                   SELECT 1 FROM taster_moderations m
                                   WHERE m.account_id = p.account_id AND m.hidden_at IS NOT NULL
                               ) AS hidden_by_reports
                        FROM user_profiles p
                        WHERE p.account_id = ?
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
                                rs.getString("intro"),
                                coverPhotoUrls(rs, rs.getObject("account_id", UUID.class)),
                                strings(rs, "profile_tags"),
                                strings(rs, "preference_tags"),
                                strings(rs, "excluded_tags"),
                                rs.getBoolean("hidden_by_reports")),
                        accountId)
                .stream()
                .findFirst()
                .map(this::toView);
    }

    /** 프로필과 두 종류의 태그를 함께 저장합니다. 검증 실패 시 모든 변경을 되돌립니다. */
    @Transactional
    public ProfileView updateProfile(UUID accountId, UpdateProfileRequest request) {
        String nickname = request.nickname().trim();
        if (isNicknameTaken(nickname, accountId)) throw nicknameTaken();
        String intro = request.intro() == null || request.intro().isBlank()
                ? null
                : request.intro().trim();
        FoodFocus tasterFocus = request.tasterFocus() == null ? FoodFocus.BOTH : request.tasterFocus();
        FoodFocus preferenceFocus = request.preferenceFocus() == null ? FoodFocus.BOTH : request.preferenceFocus();
        ActivityScope activityScope = request.activityScope() == null ? ActivityScope.LOCAL : request.activityScope();
        int updated;
        try {
            updated = jdbc.update(
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
        } catch (DuplicateKeyException exception) {
            // 위 확인과 저장 사이에 다른 계정이 같은 닉네임을 먼저 저장한 경우입니다. 사용자가 고른 이름이라 바꾸지 않고 알립니다.
            throw nicknameTaken();
        }
        if (updated == 0) throw ApiErrors.profileRequired();
        // 프로필 태그는 공개용, 선호 태그는 추천 전용이므로 각 관계를 독립적으로 교체합니다.
        replaceProfileTags(accountId, request.profileTags(), tasterFocus);
        replacePreferences(accountId, request.preferenceTags(), request.excludedTags(), preferenceFocus);
        return findProfile(accountId).orElseThrow();
    }

    private ProfileView toView(ProfileRow profile) {
        UUID accountId = profile.accountId();
        List<String> coverUrls = profile.coverUrls();
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
                profile.profileTags(),
                profile.preferenceTags(),
                profile.excludedTags(),
                profile.hiddenByReports());
    }

    /** 배경 사진 ID 배열을 순서대로 주소로 바꿉니다. 주소 형식은 ProfileCoverService.coverPhotoUrls와 같습니다. */
    private static List<String> coverPhotoUrls(ResultSet rs, UUID accountId) throws SQLException {
        Array photoIds = rs.getArray("cover_photo_ids");
        if (photoIds == null) return List.of();
        return Arrays.stream((Object[]) photoIds.getArray())
                .map(photoId -> ProfileMediaUrls.coverPhoto(accountId, UUID.fromString(String.valueOf(photoId))))
                .toList();
    }

    private static List<String> strings(ResultSet rs, String column) throws SQLException {
        Array values = rs.getArray(column);
        if (values == null) return List.of();
        return Arrays.stream((Object[]) values.getArray()).map(String::valueOf).toList();
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

    /** 모든 태그가 태그 사전에 있고 허용된 그룹이며, 그룹마다 MAX_TAGS_PER_GROUP개 이하인지 확인합니다. */
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

    private static ResponseStatusException nicknameTaken() {
        return new ResponseStatusException(HttpStatus.CONFLICT, NICKNAME_TAKEN);
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
            String intro,
            List<String> coverUrls,
            List<String> profileTags,
            List<String> preferenceTags,
            List<String> excludedTags,
            boolean hiddenByReports) {}
}
