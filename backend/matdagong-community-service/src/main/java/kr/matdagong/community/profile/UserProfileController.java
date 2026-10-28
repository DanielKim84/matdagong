package kr.matdagong.community.profile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** 로그인한 계정의 맛다공 프로필, 취향 설정과 이미지 변경 요청을 처리합니다. */
@RestController
@RequestMapping("/api/v1/users/me/profile")
public class UserProfileController {
    private final JdbcTemplate jdbc;
    private final ProfileImageService images;

    public UserProfileController(JdbcTemplate jdbc, ProfileImageService images) {
        this.jdbc = jdbc;
        this.images = images;
    }

    @PostMapping
    @Transactional
    public ProfileView ensureProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody EnsureProfileRequest request) {
        UUID accountId = UUID.fromString(jwt.getSubject());
        String nickname = uniqueNickname(accountId, request.nickname().trim());

        // 공통 계정 ID가 이미 있으면 사용자가 맛다공에서 정한 닉네임을 덮어쓰지 않습니다.
        jdbc.update("""
                INSERT INTO user_profiles (account_id, nickname, avatar_variant, intro)
                VALUES (?, ?, ?, '맛있는 장소를 찾아 기록하고 있어요.')
                ON CONFLICT (account_id) DO NOTHING
                """, accountId, nickname, ThreadLocalRandom.current().nextInt(1, 11));

        return findProfile(accountId);
    }

    /** 프로필과 두 종류의 태그를 함께 저장합니다. 검증 실패 시 모든 변경을 되돌립니다. */
    @PutMapping
    @Transactional
    public ProfileView updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request) {
        UUID accountId = UUID.fromString(jwt.getSubject());
        String nickname = request.nickname().trim();
        if (nickname.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "맛객 닉네임을 입력해 주세요.");
        }
        Integer duplicateCount = jdbc.queryForObject(
                "SELECT count(*) FROM user_profiles WHERE nickname = ? AND account_id <> ?",
                Integer.class, nickname, accountId);
        if (duplicateCount != null && duplicateCount > 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 사용 중인 닉네임이에요.");
        }
        String intro = request.intro() == null || request.intro().isBlank()
                ? null
                : request.intro().trim();
        String tasterFocus = focusName(request.tasterFocus());
        String preferenceFocus = focusName(request.preferenceFocus());
        String activityScope = activityScopeName(request.activityScope());
        String activityRegion = regionName(request.activityRegion(), activityScope);
        int updated = jdbc.update("""
                UPDATE user_profiles
                SET nickname = ?, intro = ?, taster_focus = ?, preference_focus = ?,
                    activity_scope = ?, activity_region = ?, upd_dt = now()
                WHERE account_id = ?
                """, nickname, intro, tasterFocus, preferenceFocus, activityScope, activityRegion, accountId);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "프로필을 먼저 등록해 주세요.");
        }
        // 프로필 태그는 공개용, 선호 태그는 추천 전용이므로 각 관계를 독립적으로 교체합니다.
        replaceProfileTags(accountId, request.profileTags(), tasterFocus);
        replacePreferences(accountId, request.preferenceTags(), request.excludedTags(), preferenceFocus);
        return findProfile(accountId);
    }

    private ProfileView findProfile(UUID accountId) {
        ProfileBase profile = jdbc.queryForObject("""
                SELECT account_id, nickname, profile_img_data IS NOT NULL AS has_avatar,
                       avatar_variant, profile_cover_data IS NOT NULL AS has_cover,
                       taster_focus, preference_focus, activity_scope, activity_region, intro
                FROM user_profiles
                WHERE account_id = ?
                """, (rs, row) -> new ProfileBase(
                rs.getObject("account_id", UUID.class),
                rs.getString("nickname"),
                rs.getBoolean("has_avatar"),
                rs.getInt("avatar_variant"),
                rs.getBoolean("has_cover"),
                rs.getString("taster_focus"),
                rs.getString("preference_focus"),
                rs.getString("activity_scope"),
                rs.getString("activity_region"),
                rs.getString("intro")), accountId);
        return new ProfileView(
                profile.accountId(), profile.nickname(),
                profile.hasAvatar() ? mediaUrl(profile.accountId(), "avatar") : null,
                profile.avatarVariant(),
                profile.hasCover() ? mediaUrl(profile.accountId(), "cover") : null,
                profile.tasterFocus(), profile.preferenceFocus(),
                profile.activityScope(), profile.activityRegion(), profile.intro(),
                tagNames(accountId, "user_profile_tags"),
                tagNames(accountId, "user_preference_tags", "LIKE"),
                tagNames(accountId, "user_preference_tags", "AVOID"));
    }

    private List<String> tagNames(UUID accountId, String relationTable) {
        return tagNames(accountId, relationTable, null);
    }

    private List<String> tagNames(UUID accountId, String relationTable, String preferenceType) {
        // 테이블 이름은 이 클래스의 고정된 호출부만 전달하므로 요청 값이 SQL에 들어가지 않습니다.
        String sql = """
                        SELECT tag.tag_name
                        FROM %s selected
                        JOIN taste_tags tag ON tag.tag_id = selected.tag_id
                        WHERE selected.account_id = ? %s
                        ORDER BY tag.sort_order
                        """.formatted(relationTable, preferenceType == null ? "" : "AND selected.preference_type = ?");
        return preferenceType == null
                ? jdbc.query(sql,
                        (rs, row) -> rs.getString("tag_name"), accountId)
                : jdbc.query(sql,
                        (rs, row) -> rs.getString("tag_name"), accountId, preferenceType);
    }

    private void replaceProfileTags(UUID accountId, List<String> requestedTags, String focus) {
        List<String> tagNames = cleanTagNames(requestedTags);
        validateTagNames(tagNames, false, focus);

        jdbc.update("DELETE FROM user_profile_tags WHERE account_id = ?", accountId);
        for (String name : tagNames) {
            jdbc.update("""
                    INSERT INTO user_profile_tags (account_id, tag_id)
                    SELECT ?, tag_id FROM taste_tags WHERE tag_name = ?
                    """, accountId, name);
        }
    }

    private void replacePreferences(UUID accountId, List<String> liked, List<String> excluded, String focus) {
        List<String> likedTags = cleanTagNames(liked);
        List<String> excludedTags = cleanTagNames(excluded);
        if (likedTags.stream().anyMatch(excludedTags::contains)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "같은 태그를 선호와 제외에 함께 등록할 수 없어요.");
        }
        validateTagNames(likedTags, false, focus);
        validateTagNames(excludedTags, true);

        jdbc.update("DELETE FROM user_preference_tags WHERE account_id = ?", accountId);
        insertPreferenceTags(accountId, likedTags, "LIKE");
        insertPreferenceTags(accountId, excludedTags, "AVOID");
    }

    private List<String> cleanTagNames(List<String> requestedTags) {
        return requestedTags == null
                ? List.of()
                : List.copyOf(new LinkedHashSet<>(requestedTags.stream()
                        .filter(name -> name != null && !name.isBlank())
                        .map(String::trim)
                        .toList()));
    }

    private void validateTagNames(List<String> tagNames, boolean visitOnly) {
        validateTagNames(tagNames, visitOnly, null);
    }

    private void validateTagNames(List<String> tagNames, boolean visitOnly, String focus) {
        if (!tagNames.isEmpty()) {
            String placeholders = String.join(",", java.util.Collections.nCopies(tagNames.size(), "?"));
            List<String> groups = jdbc.query(
                    "SELECT tag_group FROM taste_tags WHERE tag_name IN (" + placeholders + ")",
                    (rs, row) -> rs.getString("tag_group"),
                    tagNames.toArray());
            Set<String> allowedGroups = visitOnly ? Set.of("VISIT") : groupsForFocus(focus);
            if (groups.size() != tagNames.size() || groups.stream().anyMatch(group -> !allowedGroups.contains(group))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "목록에 있는 취향 태그만 선택해 주세요.");
            }
            long cuisineCount = groups.stream().filter("CUISINE"::equals).count();
            long tasteCount = groups.stream().filter("TASTE"::equals).count();
            long cafeCount = groups.stream().filter("CAFE"::equals).count();
            long occasionCount = groups.stream().filter("OCCASION"::equals).count();
            long visitCount = groups.stream().filter("VISIT"::equals).count();
            if (cuisineCount > 5 || tasteCount > 5 || cafeCount > 5 || occasionCount > 5 || visitCount > 5) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "태그 분류별로 최대 5개까지 선택할 수 있어요.");
            }
        }
    }

    private Set<String> groupsForFocus(String focus) {
        return switch (focus == null ? "BOTH" : focus) {
            case "RESTAURANT" -> Set.of("CUISINE", "TASTE", "OCCASION");
            case "CAFE_DESSERT" -> Set.of("CAFE", "OCCASION");
            default -> Set.of("CUISINE", "TASTE", "CAFE", "OCCASION");
        };
    }

    private void insertPreferenceTags(UUID accountId, List<String> tagNames, String preferenceType) {
        for (String name : tagNames) {
            jdbc.update("""
                    INSERT INTO user_preference_tags (account_id, tag_id, preference_type)
                    SELECT ?, tag_id, ? FROM taste_tags WHERE tag_name = ?
                    """, accountId, preferenceType, name);
        }
    }

    @PutMapping(value = "/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadAvatar(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("file") MultipartFile file) throws IOException {
        UUID accountId = UUID.fromString(jwt.getSubject());
        images.save(accountId, ProfileImageService.Kind.AVATAR, file);
        return ResponseEntity.noContent().build();
    }

    @PutMapping(value = "/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadCover(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("file") MultipartFile file) throws IOException {
        UUID accountId = UUID.fromString(jwt.getSubject());
        images.save(accountId, ProfileImageService.Kind.COVER, file);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Void> removeAvatar(@AuthenticationPrincipal Jwt jwt) {
        images.delete(UUID.fromString(jwt.getSubject()), ProfileImageService.Kind.AVATAR);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/cover")
    public ResponseEntity<Void> removeCover(@AuthenticationPrincipal Jwt jwt) {
        images.delete(UUID.fromString(jwt.getSubject()), ProfileImageService.Kind.COVER);
        return ResponseEntity.noContent().build();
    }

    private String uniqueNickname(UUID accountId, String requestedNickname) {
        String base = requestedNickname.isBlank() ? "맛객" : requestedNickname;
        if (base.length() > 30) base = base.substring(0, 30);

        Integer duplicateCount = jdbc.queryForObject(
                "SELECT count(*) FROM user_profiles WHERE nickname = ? AND account_id <> ?",
                Integer.class,
                base,
                accountId);
        if (duplicateCount == null || duplicateCount == 0) return base;

        String suffix = "-" + accountId.toString().substring(0, 6);
        int prefixLength = 30 - suffix.length();
        return base.substring(0, Math.min(base.length(), prefixLength)) + suffix;
    }

    private String mediaUrl(UUID accountId, String kind) {
        return "/media/profiles/%s/%s".formatted(accountId, kind);
    }

    private String focusName(String focus) {
        String value = focus == null ? "BOTH" : focus;
        if (!Set.of("RESTAURANT", "CAFE_DESSERT", "BOTH").contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "관심 분야를 확인해 주세요.");
        }
        return value;
    }

    private String activityScopeName(String scope) {
        String value = scope == null ? "LOCAL" : scope;
        if (!Set.of("LOCAL", "TRAVEL", "BOTH").contains(value)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "주 활동 방식을 확인해 주세요.");
        }
        return value;
    }

    private String regionName(String region, String activityScope) {
        if ("TRAVEL".equals(activityScope) || region == null || region.isBlank()) return null;
        String value = region.trim();
        return value.length() > 50 ? value.substring(0, 50) : value;
    }

    public record EnsureProfileRequest(@NotBlank @Size(max = 30) String nickname) {}

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 30) String nickname,
            @Size(max = 300) String intro,
            String tasterFocus,
            String preferenceFocus,
            String activityScope,
            @Size(max = 50) String activityRegion,
            @Size(max = 20) List<@NotBlank @Size(max = 30) String> profileTags,
            @Size(max = 20) List<@NotBlank @Size(max = 30) String> preferenceTags,
            @Size(max = 5) List<@NotBlank @Size(max = 30) String> excludedTags) {}

    public record ProfileView(
            UUID accountId,
            String nickname,
            String profileImgUrl,
            int avatarVariant,
            String profileCoverUrl,
            String tasterFocus,
            String preferenceFocus,
            String activityScope,
            String activityRegion,
            String intro,
            List<String> profileTags,
            List<String> preferenceTags,
            List<String> excludedTags) {}

    private record ProfileBase(
            UUID accountId,
            String nickname,
            boolean hasAvatar,
            int avatarVariant,
            boolean hasCover,
            String tasterFocus,
            String preferenceFocus,
            String activityScope,
            String activityRegion,
            String intro) {}
}
