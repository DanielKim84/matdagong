package kr.matdagong.community.profile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * 프로필 사진과 배경 사진의 형식을 검증하고 파일 데이터와 MIME 형식을 함께 저장·조회합니다.
 * 배경 사진은 V33부터 user_profile_cover_photos 갤러리에만 저장하며, user_profiles의 예전 배경 칼럼은 읽거나 쓰지 않습니다.
 */
@Service
public class ProfileImageService {
    private static final long MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private final JdbcTemplate jdbc;

    public ProfileImageService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ProfileImage findAvatar(UUID accountId) {
        ProfileImage image = jdbc.query("""
                SELECT profile_img_data, profile_img_mime_type
                FROM user_profiles WHERE account_id = ?
                """, rs -> {
            if (!rs.next()) return null;
            byte[] data = rs.getBytes(1);
            String mimeType = rs.getString(2);
            return data == null || mimeType == null ? null : new ProfileImage(data, mimeType);
        }, accountId);
        if (image == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "등록된 프로필 이미지가 없습니다.");
        }
        return image;
    }

    /** 주소의 계정과 사진 소유 계정이 같을 때만 반환해 다른 맛객 경로로 같은 사진을 열 수 없게 합니다. */
    public ProfileImage findCoverPhoto(UUID accountId, UUID photoId) {
        return jdbc.query("SELECT photo_data, mime_type FROM user_profile_cover_photos WHERE account_id = ? AND photo_id = ?",
                rs -> rs.next() ? new ProfileImage(rs.getBytes(1), rs.getString(2)) : null, accountId, photoId);
    }

    public void saveAvatar(UUID accountId, MultipartFile file) throws IOException {
        ProfileImage image = validate(file);
        updateAvatar(accountId, image.data(), image.mimeType());
    }

    public ProfileImage validate(MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > MAX_IMAGE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지는 5MB 이하로 선택해 주세요.");
        }
        String mimeType = file.getContentType();
        byte[] data = file.getBytes();
        // 확장자와 요청의 Content-Type만 믿지 않고 파일의 실제 이미지 헤더도 확인합니다.
        if (mimeType == null || !matchesImageSignature(mimeType, data)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JPG, PNG, WEBP 이미지 파일을 선택해 주세요.");
        }
        return new ProfileImage(data, mimeType);
    }

    public void deleteAvatar(UUID accountId) {
        updateAvatar(accountId, null, null);
    }

    private void updateAvatar(UUID accountId, byte[] data, String mimeType) {
        int updated = jdbc.update("""
                UPDATE user_profiles
                SET profile_img_data = ?, profile_img_mime_type = ?, upd_dt = now()
                WHERE account_id = ?
                """, data, mimeType, accountId);
        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "프로필을 찾을 수 없습니다.");
        }
    }

    private boolean matchesImageSignature(String mimeType, byte[] data) {
        return switch (mimeType) {
            case "image/jpeg" -> data.length >= 3
                    && (data[0] & 0xff) == 0xff && (data[1] & 0xff) == 0xd8 && (data[2] & 0xff) == 0xff;
            case "image/png" -> data.length >= 8
                    && data[0] == (byte) 0x89 && data[1] == 0x50 && data[2] == 0x4e && data[3] == 0x47
                    && data[4] == 0x0d && data[5] == 0x0a && data[6] == 0x1a && data[7] == 0x0a;
            case "image/webp" -> data.length >= 12
                    && new String(data, 0, 4, StandardCharsets.US_ASCII).equals("RIFF")
                    && new String(data, 8, 4, StandardCharsets.US_ASCII).equals("WEBP");
            default -> false;
        };
    }

    public record ProfileImage(byte[] data, String mimeType) {}
}
