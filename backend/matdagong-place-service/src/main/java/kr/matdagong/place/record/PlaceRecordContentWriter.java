package kr.matdagong.place.record;

import static kr.matdagong.place.record.PlaceRecordModels.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.place.media.MediaModels.Photo;
import kr.matdagong.place.media.PlacePhotoService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * 기록 하나의 하위 내용(메뉴·태그·방문 조건·사진)을 요청 내용으로 바꿔 저장합니다.
 * 트랜잭션은 PlaceRecordService가 열고, 이 클래스는 그 안에서만 불립니다.
 */
@Component
class PlaceRecordContentWriter {
    private static final int MAX_TOTAL_PHOTO_BYTES = 20 * 1024 * 1024;
    /** 유지할 메뉴·사진을 새 순서로 다시 매기기 전에 잠시 옮겨 두는 순번입니다. (record_id, sort_no) 고유 제약과 겹치지 않게 합니다. */
    private static final int TEMPORARY_SORT_OFFSET = 1000;

    private final JdbcTemplate jdbc;
    private final PlacePhotoService photos;

    PlaceRecordContentWriter(JdbcTemplate jdbc, PlacePhotoService photos) {
        this.jdbc = jdbc;
        this.photos = photos;
    }

    /** 새로 올린 사진(기존 사진 주소 제외)의 전체 용량을 저장 전에 확인합니다. 사진 형식도 여기서 함께 걸러집니다. */
    void validatePhotoSize(CreatePlaceRecordRequest request) {
        long photoBytes = 0;
        for (String image : safe(request.photos())) {
            if (photos.recordPhotoId(image) == null) {
                photoBytes += photos.decode(image).bytes().length;
            }
        }
        for (MenuInput menu : safe(request.menus())) {
            if (hasText(menu.photo()) && photos.menuPhotoId(menu.photo()) == null) {
                photoBytes += photos.decode(menu.photo()).bytes().length;
            }
        }
        if (photoBytes > MAX_TOTAL_PHOTO_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사진 전체 용량은 20MB 이하로 등록해 주세요.");
        }
    }

    void replaceContents(UUID recordId, CreatePlaceRecordRequest request) {
        replaceMenus(recordId, safe(request.menus()));
        replaceTags(recordId, safe(request.tags()), request.tagGroups());
        replaceVisitConditions(recordId, safe(request.visitConditions()));
        replacePhotos(recordId, safe(request.photos()));
    }

    /** 사진 주소를 다시 보낸 기존 메뉴는 사진을 유지한 채 이름·가격·순서만 바꾸고, 나머지 메뉴는 새로 저장합니다. */
    private void replaceMenus(UUID recordId, List<MenuInput> menus) {
        List<UUID> existingMenuIds = jdbc.query(
                "SELECT menu_id FROM restaurant_record_menus WHERE record_id = ?",
                (rs, row) -> rs.getObject("menu_id", UUID.class),
                recordId);
        List<UUID> keptMenuIds = menus.stream()
                .map(menu -> photos.menuPhotoId(menu.photo()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        for (UUID menuId : keptMenuIds) {
            if (!hasMenuPhoto(recordId, menuId)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "다른 맛집의 메뉴 사진은 수정 기록에 포함할 수 없습니다.");
            }
        }
        for (UUID menuId : existingMenuIds) {
            if (!keptMenuIds.contains(menuId)) {
                jdbc.update("DELETE FROM restaurant_record_menus WHERE menu_id = ?", menuId);
            }
        }
        for (int menuOrder = 0; menuOrder < keptMenuIds.size(); menuOrder++) {
            jdbc.update(
                    "UPDATE restaurant_record_menus SET sort_no = ? WHERE menu_id = ? AND record_id = ?",
                    TEMPORARY_SORT_OFFSET + menuOrder,
                    keptMenuIds.get(menuOrder),
                    recordId);
        }
        int index = 0;
        for (MenuInput menu : menus) {
            UUID existingMenuId = photos.menuPhotoId(menu.photo());
            if (existingMenuId != null) {
                jdbc.update(
                        "UPDATE restaurant_record_menus SET menu_name = ?, price_amt = ?, sort_no = ? WHERE menu_id = ? AND record_id = ?",
                        menu.name().trim(),
                        menu.price(),
                        index++,
                        existingMenuId,
                        recordId);
                continue;
            }
            Photo menuPhoto = hasText(menu.photo()) ? photos.decode(menu.photo()) : null;
            jdbc.update(
                    """
                    INSERT INTO restaurant_record_menus(menu_id, record_id, menu_name, price_amt, sort_no, photo_data, photo_mime_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    UUID.randomUUID(),
                    recordId,
                    menu.name().trim(),
                    menu.price(),
                    index++,
                    menuPhoto == null ? null : menuPhoto.bytes(),
                    menuPhoto == null ? null : menuPhoto.mimeType());
        }
    }

    /** 메뉴 태그 그룹이 없거나 메뉴 그룹이 아니면 맛(TASTE)으로 저장합니다. */
    private void replaceTags(UUID recordId, List<String> tags, Map<String, String> tagGroups) {
        jdbc.update("DELETE FROM restaurant_record_tags WHERE record_id = ?", recordId);
        for (String tag : tags) {
            if (tag.isBlank()) continue;
            TasteTagGroup group = TasteTagGroup.fromName(tagGroups == null ? null : tagGroups.get(tag));
            if (group == null || group == TasteTagGroup.VISIT) group = TasteTagGroup.TASTE;
            jdbc.update(
                    "INSERT INTO restaurant_record_tags(record_id, tag_name, tag_group) VALUES (?, ?, ?) ON CONFLICT (record_id, tag_name) DO UPDATE SET tag_group = EXCLUDED.tag_group",
                    recordId,
                    tag.trim(),
                    group.name());
        }
    }

    private void replaceVisitConditions(UUID recordId, List<String> conditions) {
        jdbc.update("DELETE FROM restaurant_record_visit_conditions WHERE record_id = ?", recordId);
        for (String condition : conditions) {
            if (condition.isBlank()) continue;
            jdbc.update(
                    "INSERT INTO restaurant_record_visit_conditions(record_id, condition_name) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    recordId,
                    condition.trim());
        }
    }

    /** 사진 주소를 다시 보낸 기존 사진은 순서만 바꾸고, data URL은 새 사진으로 저장합니다. 빠진 사진은 지웁니다. */
    private void replacePhotos(UUID recordId, List<String> photoValues) {
        List<UUID> existingPhotoIds = jdbc.query(
                "SELECT photo_id FROM restaurant_record_photos WHERE record_id = ?",
                (rs, row) -> rs.getObject("photo_id", UUID.class),
                recordId);
        List<UUID> keptPhotoIds = photoValues.stream()
                .map(photos::recordPhotoId)
                .filter(Objects::nonNull)
                .toList();
        for (int photoOrder = 0; photoOrder < keptPhotoIds.size(); photoOrder++) {
            jdbc.update(
                    "UPDATE restaurant_record_photos SET sort_no = ? WHERE photo_id = ? AND record_id = ?",
                    TEMPORARY_SORT_OFFSET + photoOrder,
                    keptPhotoIds.get(photoOrder),
                    recordId);
        }
        for (UUID photoId : existingPhotoIds) {
            if (!keptPhotoIds.contains(photoId)) {
                jdbc.update("DELETE FROM restaurant_record_photos WHERE photo_id = ?", photoId);
            }
        }
        int index = 0;
        for (String value : photoValues) {
            UUID existingPhotoId = photos.recordPhotoId(value);
            if (existingPhotoId != null) {
                if (!hasPhoto(recordId, existingPhotoId)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "다른 맛집의 사진은 수정 기록에 포함할 수 없습니다.");
                }
                jdbc.update(
                        "UPDATE restaurant_record_photos SET sort_no = ? WHERE photo_id = ?", index++, existingPhotoId);
                continue;
            }
            Photo photo = photos.decode(value);
            jdbc.update(
                    """
                    INSERT INTO restaurant_record_photos(photo_id, record_id, photo_data, mime_type, sort_no)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    UUID.randomUUID(),
                    recordId,
                    photo.bytes(),
                    photo.mimeType(),
                    index++);
        }
    }

    private boolean hasMenuPhoto(UUID recordId, UUID menuId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM restaurant_record_menus
                    WHERE menu_id = ? AND record_id = ? AND photo_data IS NOT NULL
                )
                """,
                Boolean.class,
                menuId,
                recordId));
    }

    private boolean hasPhoto(UUID recordId, UUID photoId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                "SELECT EXISTS (SELECT 1 FROM restaurant_record_photos WHERE photo_id = ? AND record_id = ?)",
                Boolean.class,
                photoId,
                recordId));
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static <T> List<T> safe(List<T> values) {
        return values == null ? List.of() : values;
    }
}
