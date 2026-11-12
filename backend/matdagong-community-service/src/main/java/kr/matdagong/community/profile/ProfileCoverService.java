package kr.matdagong.community.profile;

import static kr.matdagong.community.profile.ProfileModels.*;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import kr.matdagong.common.web.ApiErrors;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** 맛객 프로필의 배경 사진 갤러리(최대 10장)를 순서와 함께 저장·삭제합니다. 순번(sort_no)은 늘 0부터 빈틈없이 둡니다. */
@Service
public class ProfileCoverService {
    /** 배경 사진 최대 장수입니다. 화면 profile-edit/profileImages.ts의 MAX_COVER_COUNT와 맞춥니다. */
    private static final int MAX_COVER_PHOTOS = 10;

    private static final long MAX_TOTAL_BYTES = 30L * 1024 * 1024;
    private static final String TOO_MANY_COVERS = "배경 사진은 최대 10장까지 등록할 수 있어요.";

    private final JdbcTemplate jdbc;
    private final ProfileImageService images;

    public ProfileCoverService(JdbcTemplate jdbc, ProfileImageService images) {
        this.jdbc = jdbc;
        this.images = images;
    }

    /** 배경 사진을 기존 갤러리 뒤에 추가하고, 추가 후 전체 배경 사진 주소를 순서대로 반환합니다. */
    @Transactional
    public List<String> addCovers(UUID accountId, List<MultipartFile> files) throws IOException {
        if (files.isEmpty() || files.size() > MAX_COVER_PHOTOS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, TOO_MANY_COVERS);
        }
        long totalBytes = files.stream().mapToLong(MultipartFile::getSize).sum();
        if (totalBytes > MAX_TOTAL_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "배경 사진의 전체 용량은 30MB 이하로 선택해 주세요.");
        }
        // 같은 계정의 동시 업로드가 같은 순번을 계산하지 않도록 프로필 행을 잠근 뒤 기존 장수와 다음 순번을 읽습니다.
        if (!ProfileQueries.lock(jdbc, accountId)) throw ApiErrors.profileRequired();
        int[] countAndNext = jdbc.queryForObject(
                """
                SELECT count(*), COALESCE(MAX(sort_no), -1) + 1
                FROM user_profile_cover_photos WHERE account_id = ?
                """,
                (rs, row) -> new int[] {rs.getInt(1), rs.getInt(2)},
                accountId);
        if (countAndNext[0] + files.size() > MAX_COVER_PHOTOS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, TOO_MANY_COVERS);
        }
        int next = countAndNext[1];
        for (MultipartFile file : files) {
            ProfileImage image = images.validate(file);
            jdbc.update(
                    "INSERT INTO user_profile_cover_photos(account_id, photo_data, mime_type, sort_no) VALUES (?, ?, ?, ?)",
                    accountId,
                    image.data(),
                    image.mimeType(),
                    next++);
        }
        return ProfileMediaUrls.coverPhotos(
                accountId,
                jdbc.query(
                        "SELECT photo_id FROM user_profile_cover_photos WHERE account_id = ? ORDER BY sort_no",
                        (rs, row) -> rs.getObject("photo_id", UUID.class),
                        accountId));
    }

    /** 저장 재시도에서 이미 지운 사진을 다시 요청할 수 있어 없는 사진 삭제도 성공으로 처리합니다. */
    @Transactional
    public void removeCover(UUID accountId, UUID photoId) {
        int deleted = jdbc.update(
                "DELETE FROM user_profile_cover_photos WHERE account_id = ? AND photo_id = ?", accountId, photoId);
        if (deleted == 0) return;

        // (account_id, sort_no) 유일 제약은 행마다 바로 검사하므로, 먼저 음수 순번(-sort_no - 1)으로 옮겨 겹치지 않게 한 뒤
        // 원래 순서(음수에서는 내림차순)대로 0부터 다시 매깁니다.
        jdbc.update("UPDATE user_profile_cover_photos SET sort_no = -sort_no - 1 WHERE account_id = ?", accountId);
        jdbc.update(
                """
                UPDATE user_profile_cover_photos photo
                SET sort_no = ordered.new_sort_no
                FROM (
                    SELECT photo_id, row_number() OVER (ORDER BY sort_no DESC) - 1 AS new_sort_no
                    FROM user_profile_cover_photos WHERE account_id = ?
                ) ordered
                WHERE photo.photo_id = ordered.photo_id
                """,
                accountId);
    }
}
