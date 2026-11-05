package kr.matdagong.place.media;

import static kr.matdagong.place.media.MediaModels.*;

import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import kr.matdagong.common.media.ImageFiles;
import kr.matdagong.place.profile.HiddenTasters;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 기록 사진·메뉴 사진을 조회하고, 기록 저장 요청의 사진 값(새 사진 data URL 또는 유지할 기존 사진 주소)을 해석합니다.
 * 사진 바이트는 기록 JSON에 넣지 않고 /media 주소로 따로 내려줍니다.
 */
@Service
public class PlacePhotoService {
    private static final Pattern DATA_URL = Pattern.compile("^data:(image/(?:jpeg|png|webp));base64,(.+)$");
    // 비공개 기록 사진은 만료 서명이 붙은 주소로 내려가므로, 수정 요청에서는 쿼리 문자열이 있어도 기존 사진으로 인식합니다.
    private static final Pattern RECORD_PHOTO_REFERENCE = photoReference(MediaUrlSigner.RECORD_PHOTO);
    private static final Pattern MENU_PHOTO_REFERENCE = photoReference(MediaUrlSigner.MENU_PHOTO);
    private static final int MAX_PHOTO_BYTES = 5 * 1024 * 1024;
    private static final String INVALID_PHOTO_FORMAT = "등록할 사진 형식을 확인해 주세요.";
    private static final RowMapper<Photo> PHOTO_MAPPER = (rs, row) -> new Photo(rs.getBytes(1), rs.getString(2));

    private final JdbcTemplate jdbc;
    private final HiddenTasters hiddenTasters;

    public PlacePhotoService(JdbcTemplate jdbc, HiddenTasters hiddenTasters) {
        this.jdbc = jdbc;
        this.hiddenTasters = hiddenTasters;
    }

    @Transactional(readOnly = true)
    public Optional<Photo> findPublicPhoto(UUID photoId) {
        return first(jdbc.query(
                """
                SELECT ph.photo_data, ph.mime_type
                FROM restaurant_record_photos ph
                JOIN restaurant_records r ON r.record_id = ph.record_id
                WHERE ph.photo_id = ? AND r.visibility = 'PUBLIC' AND NOT (r.account_id = ANY(?::uuid[]))
                """,
                PHOTO_MAPPER,
                photoId,
                hiddenTasters.ids()));
    }

    /** 서명 주소로 검증된 요청에서만 사용합니다. 공개 여부와 관계없이 사진을 반환합니다. */
    @Transactional(readOnly = true)
    public Optional<Photo> findPhoto(UUID photoId) {
        return first(jdbc.query(
                "SELECT photo_data, mime_type FROM restaurant_record_photos WHERE photo_id = ?",
                PHOTO_MAPPER,
                photoId));
    }

    @Transactional(readOnly = true)
    public Optional<Photo> findPublicMenuPhoto(UUID menuId) {
        return first(jdbc.query(
                """
                SELECT m.photo_data, m.photo_mime_type
                FROM restaurant_record_menus m
                JOIN restaurant_records r ON r.record_id = m.record_id
                WHERE m.menu_id = ? AND m.photo_data IS NOT NULL AND r.visibility = 'PUBLIC'
                  AND NOT (r.account_id = ANY(?::uuid[]))
                """,
                PHOTO_MAPPER,
                menuId,
                hiddenTasters.ids()));
    }

    /** 서명 주소로 검증된 요청에서만 사용합니다. 공개 여부와 관계없이 메뉴 사진을 반환합니다. */
    @Transactional(readOnly = true)
    public Optional<Photo> findMenuPhoto(UUID menuId) {
        return first(jdbc.query(
                """
                SELECT photo_data, photo_mime_type FROM restaurant_record_menus
                WHERE menu_id = ? AND photo_data IS NOT NULL
                """,
                PHOTO_MAPPER,
                menuId));
    }

    /** 새로 올린 사진(base64 data URL)을 바이트로 바꾸고, 한 장 5MB 이하인지와 실제 이미지인지 확인합니다. */
    public Photo decode(String dataUrl) {
        Matcher matcher = DATA_URL.matcher(dataUrl == null ? "" : dataUrl);
        if (!matcher.matches()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_PHOTO_FORMAT);
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(matcher.group(2));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "등록할 사진 데이터를 읽을 수 없습니다.");
        }
        if (bytes.length == 0 || bytes.length > MAX_PHOTO_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사진 한 장은 5MB 이하로 등록해 주세요.");
        }
        String mimeType = matcher.group(1);
        if (!ImageFiles.matchesSignature(mimeType, bytes)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, INVALID_PHOTO_FORMAT);
        }
        return new Photo(bytes, mimeType);
    }

    /** 기존 기록 사진 주소면 사진 ID를, 새로 올린 data URL처럼 주소 형식이 아니면 null을 반환합니다. */
    public UUID recordPhotoId(String value) {
        return referenceId(RECORD_PHOTO_REFERENCE, value, "수정할 사진 정보를 확인해 주세요.");
    }

    /** 기존 메뉴 사진 주소면 메뉴 ID를, 그 밖의 값이면 null을 반환합니다. */
    public UUID menuPhotoId(String value) {
        return referenceId(MENU_PHOTO_REFERENCE, value, "수정할 메뉴 사진 정보를 확인해 주세요.");
    }

    private static UUID referenceId(Pattern pattern, String value, String invalidMessage) {
        Matcher matcher = pattern.matcher(value == null ? "" : value);
        if (!matcher.matches()) return null;
        try {
            return UUID.fromString(matcher.group(1));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, invalidMessage);
        }
    }

    /** MediaUrlSigner가 만든 /media/{kind}/{id} 주소에서 ID를 꺼냅니다. 서명 쿼리 문자열은 있어도 됩니다. */
    private static Pattern photoReference(String kind) {
        return Pattern.compile("^/media/" + Pattern.quote(kind) + "/([0-9a-fA-F-]{36})(?:\\?[^#]*)?$");
    }

    private static Optional<Photo> first(List<Photo> photos) {
        return photos.stream().findFirst();
    }
}
