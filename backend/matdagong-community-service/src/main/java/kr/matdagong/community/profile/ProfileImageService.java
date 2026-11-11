package kr.matdagong.community.profile;

import static kr.matdagong.community.profile.ProfileModels.*;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;
import kr.matdagong.common.media.ImageFiles;
import kr.matdagong.common.web.ApiErrors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * 프로필 사진(user_profiles)을 저장·조회하고 배경 사진(user_profile_cover_photos)을 조회합니다.
 * 이미지 형식·용량 검증(validate)은 배경 사진 갤러리를 저장하는 ProfileCoverService도 함께 씁니다.
 */
@Service
public class ProfileImageService {
    private static final long MAX_IMAGE_BYTES = 5 * 1024 * 1024;

    private final JdbcTemplate jdbc;

    public ProfileImageService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 신고로 가려진 맛객의 사진은 찾지 못한 것으로 답합니다(배경 사진도 같음). */
    @Transactional(readOnly = true)
    public Optional<ProfileImage> findAvatar(UUID accountId) {
        return jdbc
                .query(
                        """
                        SELECT p.profile_img_data, p.profile_img_mime_type
                        FROM user_profiles p
                        WHERE p.account_id = ? AND p.profile_img_data IS NOT NULL AND NOT %s
                        """
                                .formatted(ProfileQueries.hiddenByReports("p.account_id")),
                        (rs, row) -> new ProfileImage(rs.getBytes(1), rs.getString(2)),
                        accountId)
                .stream()
                .findFirst();
    }

    /** 주소의 계정과 사진 소유 계정이 같을 때만 반환해 다른 맛객 경로로 같은 사진을 열 수 없게 합니다. */
    @Transactional(readOnly = true)
    public Optional<ProfileImage> findCoverPhoto(UUID accountId, UUID photoId) {
        return jdbc
                .query(
                        """
                        SELECT c.photo_data, c.mime_type FROM user_profile_cover_photos c
                        WHERE c.account_id = ? AND c.photo_id = ? AND NOT %s
                        """
                                .formatted(ProfileQueries.hiddenByReports("c.account_id")),
                        (rs, row) -> new ProfileImage(rs.getBytes(1), rs.getString(2)),
                        accountId,
                        photoId)
                .stream()
                .findFirst();
    }

    @Transactional
    public void saveAvatar(UUID accountId, MultipartFile file) throws IOException {
        ProfileImage image = validate(file);
        updateAvatar(accountId, image.data(), image.mimeType());
    }

    @Transactional
    public void deleteAvatar(UUID accountId) {
        updateAvatar(accountId, null, null);
    }

    ProfileImage validate(MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > MAX_IMAGE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지는 5MB 이하로 선택해 주세요.");
        }
        String mimeType = file.getContentType();
        byte[] data = file.getBytes();
        if (!ImageFiles.matchesSignature(mimeType, data)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JPG, PNG, WEBP 이미지 파일을 선택해 주세요.");
        }
        return new ProfileImage(data, mimeType);
    }

    private void updateAvatar(UUID accountId, byte[] data, String mimeType) {
        int updated = jdbc.update(
                """
                UPDATE user_profiles
                SET profile_img_data = ?, profile_img_mime_type = ?, upd_dt = now()
                WHERE account_id = ?
                """,
                data,
                mimeType,
                accountId);
        if (updated == 0) throw ApiErrors.profileRequired();
    }
}
