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
import kr.matdagong.common.jdbc.JdbcArrays;
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

    /** user_profiles.avatar_variant의 CHECK(1~10)와 같습니다. */
    private static final int AVATAR_VARIANT_COUNT = 10;

    private final JdbcTemplate jdbc;

    public UserProfileService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * 공통 계정 ID로 프로필이 이미 있으면 사용자가 맛다공에서 정한 닉네임을 덮어쓰지 않고 그대로 돌려줍니다.
     * 닉네임이 겹치면 사용자에게 묻지 않고 접미사를 바꿔 가며 다시 시도합니다. 가입 화면은 미리 확인(isNicknameAvailable)한
     * 이름을 보내고 곧바로 프로필 수정으로 그 이름을 다시 저장하므로, 그 사이 다른 맛객이 먼저 썼다면 수정 요청이 409로
     * 알려 사용자가 고칩니다. 접미사 이름이 그대로 남는 것은 가입 도중 끊겨 앱이 로그인 이름으로 프로필을 만든 경우뿐입니다.
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

    /** 프로필과 배경 사진·태그 세 종류·가림 여부를 한 번에 읽습니다. 태그는 태그 사전 순서(sort_order)입니다. */
    @Transactional(readOnly = true)
    public Optional<ProfileView> findProfile(UUID accountId) {
        return jdbc
                .query(
                        """
                        SELECT p.account_id, p.nickname, %s,
                               p.avatar_variant, p.taster_focus, p.preference_focus, p.activity_scope,
                               p.activity_region, p.intro, %s, %s,
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
                               %s AS hidden_by_reports
                        FROM user_profiles p
                        WHERE p.account_id = ?
                        """
                                .formatted(
                                        ProfileQueries.HAS_AVATAR,
                                        ProfileQueries.COVER_PHOTO_IDS,
                                        ProfileQueries.PROFILE_TAG_NAMES,
                                        ProfileQueries.hiddenByReports("p.account_id")),
                        (rs, row) -> {
                            List<String> coverUrls = ProfileQueries.coverUrls(rs, accountId);
                            return new ProfileView(
                                    accountId,
                                    rs.getString("nickname"),
                                    ProfileQueries.avatarUrl(rs, accountId),
                                    rs.getInt("avatar_variant"),
                                    coverUrls,
                                    FoodFocus.valueOf(rs.getString("taster_focus")),
                                    FoodFocus.valueOf(rs.getString("preference_focus")),
                                    ActivityScope.valueOf(rs.getString("activity_scope")),
                                    rs.getString("activity_region"),
                                    rs.getString("intro"),
                                    JdbcArrays.strings(rs, "profile_tags"),
                                    JdbcArrays.strings(rs, "preference_tags"),
                                    JdbcArrays.strings(rs, "excluded_tags"),
                                    rs.getBoolean("hidden_by_reports"));
                        },
                        accountId)
                .stream()
                .findFirst();
    }

    /** 프로필과 두 종류의 태그를 함께 저장합니다. 검증 실패 시 모든 변경을 되돌립니다. */
    @Transactional
    public ProfileView updateProfile(UUID accountId, UpdateProfileRequest request) {
        if (isNicknameTaken(request.nickname(), accountId)) throw nicknameTaken();
        int updated;
        try {
            updated = jdbc.update(
                    """
                    UPDATE user_profiles
                    SET nickname = ?, intro = ?, taster_focus = ?, preference_focus = ?,
                        activity_scope = ?, activity_region = ?, upd_dt = now()
                    WHERE account_id = ?
                    """,
                    request.nickname(),
                    request.intro(),
                    request.tasterFocus().name(),
                    request.preferenceFocus().name(),
                    request.activityScope().name(),
                    // 여행 위주 맛객은 한 지역에 묶이지 않으므로 활동 지역을 저장하지 않습니다.
                    request.activityScope() == ActivityScope.TRAVEL ? null : request.activityRegion(),
                    accountId);
        } catch (DuplicateKeyException exception) {
            // 위 확인과 저장 사이에 다른 계정이 같은 닉네임을 먼저 저장한 경우입니다. 사용자가 고른 이름이라 바꾸지 않고 알립니다.
            throw nicknameTaken();
        }
        if (updated == 0) throw ApiErrors.profileRequired();
        // 프로필 태그는 공개용, 선호 태그는 추천 전용이므로 각 관계를 독립적으로 교체합니다.
        replaceProfileTags(accountId, request.profileTags(), request.tasterFocus());
        replacePreferences(accountId, request.preferenceTags(), request.excludedTags(), request.preferenceFocus());
        return findProfile(accountId).orElseThrow();
    }

    private void replaceProfileTags(UUID accountId, List<String> requestedTags, FoodFocus focus) {
        List<String> tagNames = cleanTagNames(requestedTags);
        validateTagNames(tagNames, focus.allowedGroups());

        jdbc.update("DELETE FROM user_profile_tags WHERE account_id = ?", accountId);
        jdbc.update(
                """
                INSERT INTO user_profile_tags (account_id, tag_id)
                SELECT ?, tag_id FROM taste_tags WHERE tag_name = ANY(?::text[])
                """,
                accountId,
                tagNames.toArray(String[]::new));
    }

    private void replacePreferences(UUID accountId, List<String> liked, List<String> excluded, FoodFocus focus) {
        List<String> likedTags = cleanTagNames(liked);
        List<String> excludedTags = cleanTagNames(excluded);
        if (likedTags.stream().anyMatch(excludedTags::contains)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "같은 태그를 선호와 제외에 함께 등록할 수 없어요.");
        }
        validateTagNames(likedTags, focus.allowedGroups());
        // 피하고 싶은 조건은 매장 이용(VISIT) 분류만 고를 수 있습니다.
        validateTagNames(excludedTags, Set.of(TasteTagGroup.VISIT));

        jdbc.update("DELETE FROM user_preference_tags WHERE account_id = ?", accountId);
        insertPreferenceTags(accountId, likedTags, PreferenceType.LIKE);
        insertPreferenceTags(accountId, excludedTags, PreferenceType.AVOID);
    }

    private void insertPreferenceTags(UUID accountId, List<String> tagNames, PreferenceType type) {
        jdbc.update(
                """
                INSERT INTO user_preference_tags (account_id, tag_id, preference_type)
                SELECT ?, tag_id, ? FROM taste_tags WHERE tag_name = ANY(?::text[])
                """,
                accountId,
                type.name(),
                tagNames.toArray(String[]::new));
    }

    /** 빈 이름을 빼고 앞뒤 공백을 지운 뒤, 같은 이름은 처음 한 번만 남깁니다. */
    private static List<String> cleanTagNames(List<String> requestedTags) {
        return requestedTags == null
                ? List.of()
                : List.copyOf(new LinkedHashSet<>(requestedTags.stream()
                        .filter(name -> name != null && !name.isBlank())
                        .map(String::trim)
                        .toList()));
    }

    /** 모든 태그가 태그 사전에 있고 허용된 분류이며, 분류마다 그 분류의 한도(maxSelections) 이하인지 확인합니다. */
    private void validateTagNames(List<String> tagNames, Set<TasteTagGroup> allowedGroups) {
        if (tagNames.isEmpty()) return;
        List<TasteTagGroup> groups = jdbc.query(
                "SELECT tag_group FROM taste_tags WHERE tag_name = ANY(?::text[])",
                (rs, row) -> TasteTagGroup.valueOf(rs.getString("tag_group")),
                (Object) tagNames.toArray(String[]::new));
        // tag_name은 유일하므로, 찾은 수가 적으면 사전에 없는 이름이 섞인 것입니다.
        if (groups.size() != tagNames.size() || !allowedGroups.containsAll(groups)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "목록에 있는 취향 태그만 선택해 주세요.");
        }
        Map<TasteTagGroup, Integer> counts = new EnumMap<>(TasteTagGroup.class);
        groups.forEach(group -> counts.merge(group, 1, Integer::sum));
        counts.forEach((group, count) -> {
            if (count > group.maxSelections()) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "'" + group.label() + "'에서는 최대 " + group.maxSelections() + "개까지 선택할 수 있어요.");
            }
        });
    }

    private static ResponseStatusException nicknameTaken() {
        return new ResponseStatusException(HttpStatus.CONFLICT, NICKNAME_TAKEN);
    }

    /** 앞뒤 공백을 뺀 닉네임이 비지 않고 한도 안이며 다른 맛객이 쓰지 않으면 true입니다. 수정 요청과 같은 기준입니다. */
    @Transactional(readOnly = true)
    public boolean isNicknameAvailable(String nickname, UUID accountId) {
        String trimmed = nickname.trim();
        return !trimmed.isEmpty()
                && trimmed.length() <= ProfileModels.MAX_NICKNAME_LENGTH
                && !isNicknameTaken(trimmed, accountId);
    }

    private boolean isNicknameTaken(String nickname, UUID accountId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE nickname = ? AND account_id <> ?)",
                Boolean.class,
                nickname,
                accountId));
    }
}
