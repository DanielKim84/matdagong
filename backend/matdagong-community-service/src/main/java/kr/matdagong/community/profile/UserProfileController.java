package kr.matdagong.community.profile;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.io.IOException;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import kr.matdagong.community.security.AuthenticatedAccount;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
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
    private static final int MAX_COVER_PHOTOS = 10;
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
        UUID accountId = AuthenticatedAccount.id(jwt);
        String nickname = uniqueNickname(accountId, request.nickname().trim());

        // 공통 계정 ID가 이미 있으면 사용자가 맛다공에서 정한 닉네임을 덮어쓰지 않습니다.
        jdbc.update("""
                INSERT INTO user_profiles (account_id, nickname, avatar_variant, intro)
                VALUES (?, ?, ?, '맛있는 장소를 찾아 기록하고 있어요.')
                ON CONFLICT (account_id) DO NOTHING
                """, accountId, nickname, ThreadLocalRandom.current().nextInt(1, 11));

        return findProfile(accountId);
    }

    /** 로그인한 계정의 프로필을 조회합니다. 장소 서비스가 기록 작성자 정보를 확인할 때도 사용합니다. */
    @GetMapping
    public ProfileView profile(@AuthenticationPrincipal Jwt jwt) {
        UUID accountId = AuthenticatedAccount.id(jwt);
        Boolean exists = jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE account_id = ?)", Boolean.class, accountId);
        if (!Boolean.TRUE.equals(exists)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "맛객 프로필이 없습니다.");
        }
        return findProfile(accountId);
    }

    /** 프로필과 두 종류의 태그를 함께 저장합니다. 검증 실패 시 모든 변경을 되돌립니다. */
    @PutMapping
    @Transactional
    public ProfileView updateProfile(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody UpdateProfileRequest request) {
        UUID accountId = AuthenticatedAccount.id(jwt);
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
                       avatar_variant, taster_focus, preference_focus, activity_scope, activity_region, intro
                FROM user_profiles
                WHERE account_id = ?
                """, (rs, row) -> new ProfileBase(
                rs.getObject("account_id", UUID.class),
                rs.getString("nickname"),
                rs.getBoolean("has_avatar"),
                rs.getInt("avatar_variant"),
                rs.getString("taster_focus"),
                rs.getString("preference_focus"),
                rs.getString("activity_scope"),
                rs.getString("activity_region"),
                rs.getString("intro")), accountId);
        List<String> coverUrls = coverPhotoUrls(accountId);
        return new ProfileView(
                profile.accountId(), profile.nickname(),
                profile.hasAvatar() ? ProfileMediaUrls.avatar(profile.accountId()) : null,
                profile.avatarVariant(),
                // 단일 배경 주소를 읽는 화면과 호환되도록 갤러리의 첫 사진을 대표 배경으로 함께 내려줍니다.
                coverUrls.isEmpty() ? null : coverUrls.get(0),
                coverUrls,
                profile.tasterFocus(), profile.preferenceFocus(),
                profile.activityScope(), profile.activityRegion(), profile.intro(),
                tagNames(accountId, "user_profile_tags"),
                tagNames(accountId, "user_preference_tags", "LIKE"),
                tagNames(accountId, "user_preference_tags", "AVOID"));
    }

    private List<String> coverPhotoUrls(UUID accountId) {
        return jdbc.query("SELECT photo_id FROM user_profile_cover_photos WHERE account_id = ? ORDER BY sort_no",
                (rs, row) -> ProfileMediaUrls.coverPhoto(accountId, rs.getObject(1, UUID.class)), accountId);
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
            String placeholders = String.join(",", Collections.nCopies(tagNames.size(), "?"));
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
        images.saveAvatar(AuthenticatedAccount.id(jwt), file);
        return ResponseEntity.noContent().build();
    }

    /** 배경 사진을 기존 갤러리 뒤에 추가하고, 추가 후 전체 배경 사진 주소를 순서대로 반환합니다. */
    @PostMapping(value = "/covers", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @Transactional
    public List<String> uploadCoverGallery(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam("files") List<MultipartFile> files) throws IOException {
        UUID accountId = AuthenticatedAccount.id(jwt);
        if (files.isEmpty() || files.size() > MAX_COVER_PHOTOS) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배경 사진은 최대 10장까지 등록할 수 있어요.");
        long totalBytes = files.stream().mapToLong(MultipartFile::getSize).sum();
        if (totalBytes > 30L * 1024 * 1024) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배경 사진의 전체 용량은 30MB 이하로 선택해 주세요.");
        // 같은 계정의 동시 업로드가 같은 순번을 계산하지 않도록 프로필 행을 잠근 뒤 기존 장수와 순번을 읽습니다.
        List<UUID> lockedProfile = jdbc.query("SELECT account_id FROM user_profiles WHERE account_id = ? FOR UPDATE",
                (rs, row) -> rs.getObject(1, UUID.class), accountId);
        if (lockedProfile.isEmpty()) throw new ResponseStatusException(HttpStatus.CONFLICT, "맛객 프로필을 먼저 만들어 주세요.");
        Integer existing = jdbc.queryForObject("SELECT count(*) FROM user_profile_cover_photos WHERE account_id = ?", Integer.class, accountId);
        if ((existing == null ? 0 : existing) + files.size() > MAX_COVER_PHOTOS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배경 사진은 최대 10장까지 등록할 수 있어요.");
        }
        int next = jdbc.queryForObject("SELECT COALESCE(MAX(sort_no), -1) + 1 FROM user_profile_cover_photos WHERE account_id = ?", Integer.class, accountId);
        for (MultipartFile file : files) {
            ProfileImageService.ProfileImage image = images.validate(file);
            jdbc.update("INSERT INTO user_profile_cover_photos(account_id, photo_data, mime_type, sort_no) VALUES (?, ?, ?, ?)",
                    accountId, image.data(), image.mimeType(), next++);
        }
        return coverPhotoUrls(accountId);
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<Void> removeAvatar(@AuthenticationPrincipal Jwt jwt) {
        images.deleteAvatar(AuthenticatedAccount.id(jwt));
        return ResponseEntity.noContent().build();
    }

    /** 배경 사진 전체 삭제입니다. 화면의 기존 호출 경로(/cover)를 유지합니다. */
    @DeleteMapping("/cover")
    public ResponseEntity<Void> removeCover(@AuthenticationPrincipal Jwt jwt) {
        jdbc.update("DELETE FROM user_profile_cover_photos WHERE account_id = ?", AuthenticatedAccount.id(jwt));
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/covers/{photoId}")
    @Transactional
    public ResponseEntity<Void> removeCoverPhoto(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable UUID photoId) {
        UUID accountId = AuthenticatedAccount.id(jwt);
        Integer sortNo = jdbc.query("""
                SELECT sort_no FROM user_profile_cover_photos
                WHERE account_id = ? AND photo_id = ?
                """, rs -> rs.next() ? rs.getInt(1) : null, accountId, photoId);
        // 저장 재시도에서도 이미 지운 사진을 다시 요청할 수 있어 삭제는 멱등하게 처리합니다.
        if (sortNo == null) return ResponseEntity.noContent().build();

        jdbc.update("DELETE FROM user_profile_cover_photos WHERE account_id = ? AND photo_id = ?", accountId, photoId);
        // 음수 순번으로 잠시 옮겨 고유 제약과 충돌하지 않게 한 뒤 남은 사진 순서를 다시 매깁니다.
        jdbc.update("UPDATE user_profile_cover_photos SET sort_no = -sort_no - 1 WHERE account_id = ?", accountId);
        List<UUID> remainingPhotoIds = jdbc.query(
                "SELECT photo_id FROM user_profile_cover_photos WHERE account_id = ? ORDER BY sort_no DESC",
                (rs, row) -> rs.getObject(1, UUID.class), accountId);
        for (int index = 0; index < remainingPhotoIds.size(); index++) {
            jdbc.update("UPDATE user_profile_cover_photos SET sort_no = ? WHERE account_id = ? AND photo_id = ?",
                    index, accountId, remainingPhotoIds.get(index));
        }
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

    public record EnsureProfileRequest(@NotBlank @Size(max = 12) String nickname) {}

    public record UpdateProfileRequest(
            @NotBlank @Size(max = 12) String nickname,
            @Size(max = 300) String intro,
            String tasterFocus,
            String preferenceFocus,
            String activityScope,
            @Size(max = 50) String activityRegion,
            @Size(max = 30) List<@NotBlank @Size(max = 30) String> profileTags,
            @Size(max = 30) List<@NotBlank @Size(max = 30) String> preferenceTags,
            @Size(max = 5) List<@NotBlank @Size(max = 30) String> excludedTags) {}

    public record ProfileView(
            UUID accountId,
            String nickname,
            String profileImgUrl,
            int avatarVariant,
            String profileCoverUrl,
            List<String> profileCoverUrls,
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
            String tasterFocus,
            String preferenceFocus,
            String activityScope,
            String activityRegion,
            String intro) {}
}
