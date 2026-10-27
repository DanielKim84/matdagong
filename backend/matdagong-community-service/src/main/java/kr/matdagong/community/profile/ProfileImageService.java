package kr.matdagong.community.profile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** 프로필 사진과 배경의 형식을 검증하고 파일 데이터와 MIME 형식을 함께 저장합니다. */
@Service
public class ProfileImageService {
    private static final long MAX_IMAGE_BYTES = 5 * 1024 * 1024;
    private final JdbcTemplate jdbc;

    public ProfileImageService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public ProfileImage find(UUID accountId, Kind kind) {
        ProfileImage image = jdbc.query("""
                SELECT %s AS image_data, %s AS mime_type
                FROM user_profiles WHERE account_id = ?
                """.formatted(kind.dataColumn, kind.mimeColumn), rs -> {
            if (!rs.next()) return null;
            byte[] data = rs.getBytes("image_data");
            String mimeType = rs.getString("mime_type");
            return data == null || mimeType == null ? null : new ProfileImage(data, mimeType);
        }, accountId);
        if (image == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "등록된 프로필 이미지가 없습니다.");
        }
        return image;
    }

    public void save(UUID accountId, Kind kind, MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > MAX_IMAGE_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "이미지는 5MB 이하로 선택해 주세요.");
        }
        String mimeType = file.getContentType();
        byte[] data = file.getBytes();
        // 확장자와 요청의 Content-Type만 믿지 않고 파일의 실제 이미지 헤더도 확인합니다.
        if (mimeType == null || !matchesImageSignature(mimeType, data)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "JPG, PNG, WEBP 이미지 파일을 선택해 주세요.");
        }
        update(accountId, kind, data, mimeType);
    }

    public void delete(UUID accountId, Kind kind) {
        update(accountId, kind, null, null);
    }

    private void update(UUID accountId, Kind kind, byte[] data, String mimeType) {
        // 칼럼명은 아래 enum에서만 선택하므로 사용자 입력이 SQL 식별자로 들어가지 않습니다.
        int updated = jdbc.update("""
                UPDATE user_profiles
                SET %s = ?, %s = ?, upd_dt = now()
                WHERE account_id = ?
                """.formatted(kind.dataColumn, kind.mimeColumn), data, mimeType, accountId);
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

    public enum Kind {
        AVATAR("profile_img_data", "profile_img_mime_type"),
        COVER("profile_cover_data", "profile_cover_mime_type");

        private final String dataColumn;
        private final String mimeColumn;

        Kind(String dataColumn, String mimeColumn) {
            this.dataColumn = dataColumn;
            this.mimeColumn = mimeColumn;
        }

        public static Kind fromPath(String kind) {
            return switch (kind) {
                case "avatar" -> AVATAR;
                case "cover" -> COVER;
                default -> throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            };
        }
    }
}
