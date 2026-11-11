package kr.matdagong.place.record;

import static kr.matdagong.place.record.PlaceRecordModels.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import kr.matdagong.common.jdbc.JdbcArrays;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.place.media.MediaModels.Photo;
import kr.matdagong.place.media.PlacePhotoService;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * 기록 하나의 하위 내용(메뉴·태그·방문 조건·사진)을 요청 내용으로 바꿔 저장합니다.
 * 트랜잭션은 PlaceRecordService가 열고, 이 클래스는 그 안에서만 불립니다. DB가 멀리 있어 오가는 횟수를 줄이려고
 * 기존 행은 표마다 한 번만 읽어 메모리에서 확인하고, 여러 행 쓰기는 batchUpdate로 한 번에 보냅니다.
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

    /**
     * DB에 쓰기 전에 요청을 확인합니다. 태그마다 분류가 있는지, 매장 이용 조건이 정해진 이름인지, 새로 올린 사진(기존 사진 주소
     * 제외)의 전체 용량과 형식을 봅니다.
     */
    void validate(CreatePlaceRecordRequest request) {
        for (String tag : safe(request.tags())) {
            if (!tag.isBlank()) tagGroupOf(tag, request.tagGroups());
        }
        for (String condition : safe(request.visitConditions())) {
            if (!condition.isBlank() && !VISIT_CONDITIONS.contains(condition.trim())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "매장 이용 정보를 확인해 주세요.");
            }
        }
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

    /**
     * 사진 주소를 다시 보낸 기존 메뉴는 사진을 유지한 채 이름·가격·순서만 바꾸고, 나머지 메뉴는 새로 저장합니다.
     * 다시 보낸 메뉴 사진은 이 기록의 사진 있는 메뉴여야 합니다(다른 기록의 사진을 끌어오지 못하게).
     */
    private void replaceMenus(UUID recordId, List<MenuInput> menus) {
        Map<UUID, Boolean> existingHasPhoto = new HashMap<>();
        jdbc.query(
                "SELECT menu_id, photo_data IS NOT NULL AS has_photo FROM restaurant_record_menus WHERE record_id = ?",
                rs -> {
                    existingHasPhoto.put(rs.getObject("menu_id", UUID.class), rs.getBoolean("has_photo"));
                },
                recordId);
        List<UUID> keptMenuIds = menus.stream()
                .map(menu -> photos.menuPhotoId(menu.photo()))
                .filter(Objects::nonNull)
                .distinct()
                .toList();
        for (UUID menuId : keptMenuIds) {
            if (!Boolean.TRUE.equals(existingHasPhoto.get(menuId))) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "다른 맛집의 메뉴 사진은 수정 기록에 포함할 수 없습니다.");
            }
        }
        jdbc.update(
                "DELETE FROM restaurant_record_menus WHERE record_id = ? AND NOT (menu_id = ANY(?::uuid[]))",
                recordId,
                JdbcArrays.uuidParam(keptMenuIds));
        shiftSortOrder("restaurant_record_menus", recordId);

        List<Object[]> updates = new ArrayList<>();
        List<Object[]> inserts = new ArrayList<>();
        int index = 0;
        for (MenuInput menu : menus) {
            UUID existingMenuId = photos.menuPhotoId(menu.photo());
            if (existingMenuId != null) {
                updates.add(new Object[] {menu.name().trim(), menu.price(), index++, existingMenuId, recordId});
                continue;
            }
            Photo menuPhoto = hasText(menu.photo()) ? photos.decode(menu.photo()) : null;
            inserts.add(new Object[] {
                UUID.randomUUID(),
                recordId,
                menu.name().trim(),
                menu.price(),
                index++,
                menuPhoto == null ? null : menuPhoto.bytes(),
                menuPhoto == null ? null : menuPhoto.mimeType()
            });
        }
        batch(
                "UPDATE restaurant_record_menus SET menu_name = ?, price_amt = ?, sort_no = ? WHERE menu_id = ? AND record_id = ?",
                updates);
        batch(
                """
                INSERT INTO restaurant_record_menus(menu_id, record_id, menu_name, price_amt, sort_no, photo_data, photo_mime_type)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                inserts);
    }

    /**
     * 태그 분류는 validate에서 이미 확인했습니다. 공백만 다른 같은 태그가 두 번 오면 한 행만 남고 나중 분류를 씁니다.
     */
    private void replaceTags(UUID recordId, List<String> tags, Map<String, String> tagGroups) {
        jdbc.update("DELETE FROM restaurant_record_tags WHERE record_id = ?", recordId);
        List<Object[]> rows = new ArrayList<>();
        for (String tag : tags) {
            if (tag.isBlank()) continue;
            rows.add(new Object[] {
                recordId, tag.trim(), tagGroupOf(tag, tagGroups).name()
            });
        }
        batch(
                """
                INSERT INTO restaurant_record_tags(record_id, tag_name, tag_group) VALUES (?, ?, ?)
                ON CONFLICT (record_id, tag_name) DO UPDATE SET tag_group = EXCLUDED.tag_group
                """,
                rows);
    }

    /** 매장 이용 조건 이름은 validate에서 정해진 목록(VISIT_CONDITIONS)인지 이미 확인했습니다. */
    private void replaceVisitConditions(UUID recordId, List<String> conditions) {
        jdbc.update("DELETE FROM restaurant_record_visit_conditions WHERE record_id = ?", recordId);
        List<Object[]> rows = new ArrayList<>();
        for (String condition : conditions) {
            if (!condition.isBlank()) rows.add(new Object[] {recordId, condition.trim()});
        }
        batch(
                "INSERT INTO restaurant_record_visit_conditions(record_id, condition_name) VALUES (?, ?) ON CONFLICT DO NOTHING",
                rows);
    }

    /**
     * 사진 주소를 다시 보낸 기존 사진은 순서만 바꾸고, data URL은 새 사진으로 저장합니다. 빠진 사진은 지웁니다.
     * 다시 보낸 사진은 이 기록의 사진이어야 합니다.
     */
    private void replacePhotos(UUID recordId, List<String> photoValues) {
        List<UUID> existingPhotoIds = jdbc.query(
                "SELECT photo_id FROM restaurant_record_photos WHERE record_id = ?",
                (rs, row) -> rs.getObject("photo_id", UUID.class),
                recordId);
        List<UUID> keptPhotoIds = photoValues.stream()
                .map(photos::recordPhotoId)
                .filter(Objects::nonNull)
                .toList();
        if (!existingPhotoIds.containsAll(keptPhotoIds)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "다른 맛집의 사진은 수정 기록에 포함할 수 없습니다.");
        }
        jdbc.update(
                "DELETE FROM restaurant_record_photos WHERE record_id = ? AND NOT (photo_id = ANY(?::uuid[]))",
                recordId,
                JdbcArrays.uuidParam(keptPhotoIds));
        shiftSortOrder("restaurant_record_photos", recordId);

        List<Object[]> updates = new ArrayList<>();
        List<Object[]> inserts = new ArrayList<>();
        int index = 0;
        for (String value : photoValues) {
            UUID existingPhotoId = photos.recordPhotoId(value);
            if (existingPhotoId != null) {
                updates.add(new Object[] {index++, existingPhotoId, recordId});
                continue;
            }
            Photo photo = photos.decode(value);
            inserts.add(new Object[] {UUID.randomUUID(), recordId, photo.bytes(), photo.mimeType(), index++});
        }
        batch("UPDATE restaurant_record_photos SET sort_no = ? WHERE photo_id = ? AND record_id = ?", updates);
        batch(
                """
                INSERT INTO restaurant_record_photos(photo_id, record_id, photo_data, mime_type, sort_no)
                VALUES (?, ?, ?, ?, ?)
                """,
                inserts);
    }

    /**
     * 남은 메뉴·사진의 순번을 잠시 TEMPORARY_SORT_OFFSET만큼 옮깁니다. 새 순번(0부터)을 매길 때 아직 옮기지 않은 행과
     * (record_id, sort_no) 고유 제약이 겹치지 않게 하려는 것입니다. table은 이 클래스의 고정 이름만 넘깁니다.
     */
    private void shiftSortOrder(String table, UUID recordId) {
        jdbc.update(
                "UPDATE " + table + " SET sort_no = sort_no + ? WHERE record_id = ?", TEMPORARY_SORT_OFFSET, recordId);
    }

    private void batch(String sql, List<Object[]> rows) {
        if (!rows.isEmpty()) jdbc.batchUpdate(sql, rows);
    }

    /**
     * 태그의 분류(tagGroups)입니다. 분류가 없거나 모르는 값, 매장 이용(VISIT)이면 400입니다. 분류마다 뜻이 달라(예: 카페 종류와
     * 디저트·빵) 서버가 짐작해 채우면 잘못 묶이고, 매장 이용은 visitConditions로 따로 받기 때문입니다.
     */
    private static TasteTagGroup tagGroupOf(String tag, Map<String, String> tagGroups) {
        TasteTagGroup group = TasteTagGroup.fromName(tagGroups == null ? null : tagGroups.get(tag));
        if (group == null || group == TasteTagGroup.VISIT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "태그 분류를 확인해 주세요.");
        }
        return group;
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static <T> List<T> safe(List<T> values) {
        return values == null ? List.of() : values;
    }
}
