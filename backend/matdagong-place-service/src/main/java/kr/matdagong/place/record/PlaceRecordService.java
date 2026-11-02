package kr.matdagong.place.record;

import static kr.matdagong.place.catalog.PlaceModels.*;
import static kr.matdagong.place.record.PlaceRecordModels.*;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import kr.matdagong.common.tag.TasteTagGroup;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.catalog.PlaceQueryService;
import kr.matdagong.place.catalog.PlaceViewLoader;
import kr.matdagong.place.draft.QuickDraftService;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import kr.matdagong.place.like.PlaceLikeService;
import kr.matdagong.place.media.MediaModels.Photo;
import kr.matdagong.place.media.PlacePhotoService;
import kr.matdagong.place.profile.CommunityProfileClient.AuthorProfile;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 장소 고유 정보(restaurant_places)와 맛객별 추천 기록(restaurant_records 및 하위 메뉴·태그·방문 조건·사진)을
 * 나눠 저장합니다. 같은 장소에 내 기록이 이미 있으면 새로 만들지 않고 그 기록을 요청 내용으로 바꿉니다.
 */
@Service
public class PlaceRecordService {
    private static final int MAX_TOTAL_PHOTO_BYTES = 20 * 1024 * 1024;
    /** 유지할 메뉴·사진을 새 순서로 다시 매기기 전에 잠시 옮겨 두는 순번입니다. (record_id, sort_no) 고유 제약과 겹치지 않게 합니다. */
    private static final int TEMPORARY_SORT_OFFSET = 1000;

    private final JdbcTemplate jdbc;
    private final PlaceQueryService places;
    private final PlaceViewLoader loader;
    private final PlacePhotoService photos;
    private final QuickDraftService drafts;
    private final PlaceLikeService likes;

    public PlaceRecordService(
            JdbcTemplate jdbc,
            PlaceQueryService places,
            PlaceViewLoader loader,
            PlacePhotoService photos,
            QuickDraftService drafts,
            PlaceLikeService likes) {
        this.jdbc = jdbc;
        this.places = places;
        this.loader = loader;
        this.photos = photos;
        this.drafts = drafts;
        this.likes = likes;
    }

    /** 내 기록함 전용 목록은 공개 여부와 관계없이 본인 기록만 반환합니다. */
    @Transactional(readOnly = true)
    public List<PlaceView> findMine(UUID accountId) {
        List<UUID> ids = jdbc.query(
                """
                SELECT DISTINCT p.place_id
                FROM restaurant_places p
                JOIN restaurant_records r ON r.place_id = p.place_id
                WHERE r.account_id = ?
                ORDER BY p.place_id
                """,
                (rs, row) -> rs.getObject("place_id", UUID.class),
                accountId);
        return loader.load(ids, accountId, PlaceViewLoader.RecordScope.OWN_ONLY);
    }

    /**
     * 기록을 저장하고 저장된 장소를 반환합니다. 작성자 프로필과 가게 정보는 외부 호출이라 호출하는 쪽이 트랜잭션 밖에서
     * 먼저 확인해 넘깁니다. 같은 장소의 빠른 기록은 함께 지웁니다.
     */
    @Transactional
    public PlaceView createRecord(
            UUID accountId, AuthorProfile author, PlaceInfo placeInfo, CreatePlaceRecordRequest request) {
        validatePhotoSize(request);
        UUID placeId = upsertPlace(placeInfo, request);
        UUID recordId = upsertRecord(placeId, accountId, author, request);
        replaceMenus(recordId, safe(request.menus()));
        replaceTags(recordId, safe(request.tags()), request.tagGroups());
        replaceVisitConditions(recordId, safe(request.visitConditions()));
        replacePhotos(recordId, safe(request.photos()));
        drafts.deleteDraft(accountId, request.providerPlaceId(), request.providerCode());
        return places.findById(placeId.toString(), accountId).orElseThrow();
    }

    /** 좋아요한 장소를 내 기록으로 전환하고, 원자적으로 기존 좋아요를 제거합니다. */
    @Transactional
    public PlaceView convertLikeToRecord(
            UUID accountId,
            AuthorProfile author,
            PlaceInfo placeInfo,
            String sourcePlaceId,
            CreatePlaceRecordRequest request,
            boolean visitedConfirmed) {
        if (!visitedConfirmed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "직접 방문을 확인한 뒤 맛집 기록으로 등록해 주세요.");
        }
        PlaceView created = createRecord(accountId, author, placeInfo, request);
        likes.removeLikes(accountId, List.of(sourcePlaceId, created.id()));
        return created;
    }

    /** 내 기록의 하위 입력값을 함께 삭제하고 같은 장소를 내 맛집으로 저장합니다. */
    @Transactional
    public void convertRecordToLike(UUID accountId, String placeIdValue) {
        UUID placeId = PlaceIdentifiers.uuidOrNull(placeIdValue);
        if (placeId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "전환할 맛집 정보를 확인해 주세요.");
        }
        int deleted =
                jdbc.update("DELETE FROM restaurant_records WHERE place_id = ? AND account_id = ?", placeId, accountId);
        if (deleted == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "내가 등록한 맛집 기록을 찾을 수 없습니다.");
        likes.saveVisited(accountId, placeId);
    }

    /** 내 기록 여러 곳의 공개 범위를 한 번에 바꿉니다. 내 기록이 없는 장소는 건너뛰고, 바뀐 기록 수를 돌려줍니다. */
    @Transactional
    public int changeVisibility(UUID accountId, List<String> placeIds, RecordVisibility visibility) {
        List<Object[]> targets = placeIds.stream()
                .map(PlaceIdentifiers::uuidOrNull)
                .filter(Objects::nonNull)
                .distinct()
                .map(placeId -> new Object[] {visibility.name(), placeId, accountId})
                .toList();
        if (targets.isEmpty()) return 0;
        int[] counts = jdbc.batchUpdate(
                """
                UPDATE restaurant_records SET visibility = ?, upd_dt = now()
                WHERE place_id = ? AND account_id = ?
                """,
                targets);
        return Arrays.stream(counts).sum();
    }

    /** 새로 올린 사진(기존 사진 주소 제외)의 전체 용량을 저장 전에 확인합니다. 사진 형식도 여기서 함께 걸러집니다. */
    private void validatePhotoSize(CreatePlaceRecordRequest request) {
        long photoBytes = 0;
        for (String image : safe(request.photos())) {
            if (photos.recordPhotoId(image) == null)
                photoBytes += photos.decode(image).bytes().length;
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

    /**
     * 가게 행은 여러 맛객의 기록이 함께 참조합니다. 카카오에서 직접 확인한 값일 때만 최신 기본정보로 갱신하고,
     * 확인하지 못한 요청 값은 새 가게일 때만 저장합니다. 분류는 맛객이 고른 음식 종류가 반영되므로 처음 값을 유지합니다.
     * 갱신하지 않을 때도 같은 값으로 UPDATE하는 것은 충돌 시 RETURNING으로 기존 place_id를 받기 위해서입니다.
     */
    private UUID upsertPlace(PlaceInfo placeInfo, CreatePlaceRecordRequest request) {
        String onConflict = placeInfo.verified()
                ? """
                    place_name = EXCLUDED.place_name, address = EXCLUDED.address,
                    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                    provider_phone = EXCLUDED.provider_phone, provider_url = EXCLUDED.provider_url,
                    road_address = EXCLUDED.road_address, lot_address = EXCLUDED.lot_address, upd_dt = now()
                  """
                : "provider_code = restaurant_places.provider_code\n";
        return jdbc.queryForObject(
                """
                INSERT INTO restaurant_places (
                    place_id, provider_code, provider_place_id, place_name, category, address,
                    latitude, longitude, provider_phone, provider_url, road_address, lot_address
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (provider_code, provider_place_id) DO UPDATE SET
                """
                        + onConflict + """
                RETURNING place_id
                """,
                UUID.class,
                UUID.randomUUID(),
                PlaceIdentifiers.providerCode(request.providerCode()),
                request.providerPlaceId(),
                placeInfo.placeName(),
                request.category(),
                placeInfo.address(),
                placeInfo.latitude(),
                placeInfo.longitude(),
                placeInfo.phone(),
                placeInfo.url(),
                placeInfo.roadAddress(),
                placeInfo.lotAddress());
    }

    /** 작성자 이름·캐릭터는 기록 시점의 커뮤니티 프로필 값으로 함께 저장합니다. */
    private UUID upsertRecord(UUID placeId, UUID accountId, AuthorProfile author, CreatePlaceRecordRequest request) {
        return jdbc.queryForObject(
                """
                INSERT INTO restaurant_records (
                    record_id, place_id, account_id, author_name, author_avatar_variant,
                    reason, visibility
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (account_id, place_id) DO UPDATE SET
                    author_name = EXCLUDED.author_name,
                    author_avatar_variant = EXCLUDED.author_avatar_variant,
                    reason = EXCLUDED.reason, visibility = EXCLUDED.visibility, upd_dt = now()
                RETURNING record_id
                """,
                UUID.class,
                UUID.randomUUID(),
                placeId,
                accountId,
                author.nickname().trim(),
                author.avatarVariant(),
                request.reason().trim(),
                request.visibility().name());
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
            if (!keptMenuIds.contains(menuId))
                jdbc.update("DELETE FROM restaurant_record_menus WHERE menu_id = ?", menuId);
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
            if (!keptPhotoIds.contains(photoId))
                jdbc.update("DELETE FROM restaurant_record_photos WHERE photo_id = ?", photoId);
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
