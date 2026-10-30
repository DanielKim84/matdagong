package kr.matdagong.place.application;

import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import kr.matdagong.place.api.CreatePlaceRecordRequest;
import kr.matdagong.place.api.PlaceView;
import kr.matdagong.place.api.QuickPlaceDraftRequest;
import kr.matdagong.place.api.QuickPlaceDraftView;
import kr.matdagong.place.api.QuickPlaceDuplicateView;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.ResultSetExtractor;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 장소 고유 정보와 맛객별 추천 기록을 구분해 저장하고 함께 조회합니다. */
@Service
public class PlaceRecordService {
    private static final Pattern DATA_URL = Pattern.compile("^data:(image/(?:jpeg|png|webp));base64,(.+)$");
    // 비공개 기록 사진은 만료 서명이 붙은 주소로 내려가므로, 수정 요청에서는 쿼리 문자열이 있어도 기존 사진으로 인식합니다.
    private static final Pattern PHOTO_REFERENCE = Pattern.compile("^/media/place-record-photos/([0-9a-fA-F-]{36})(?:\\?[^#]*)?$");
    private static final Pattern MENU_PHOTO_REFERENCE = Pattern.compile("^/media/place-menu-photos/([0-9a-fA-F-]{36})(?:\\?[^#]*)?$");
    private static final int MAX_PHOTO_BYTES = 5 * 1024 * 1024;
    private static final RowMapper<QuickPlaceDraftView> DRAFT_MAPPER = (rs, row) -> new QuickPlaceDraftView(
            rs.getString("provider_code"), rs.getString("provider_place_id"), rs.getString("place_name"), rs.getString("category"),
            rs.getString("address"), rs.getDouble("latitude"), rs.getDouble("longitude"),
            rs.getString("provider_phone"), rs.getString("provider_url"), rs.getString("road_address"), rs.getString("lot_address"),
            rs.getObject("reg_dt", OffsetDateTime.class));
    private static final ResultSetExtractor<Photo> SINGLE_PHOTO =
            rs -> rs.next() ? new Photo(rs.getBytes(1), rs.getString(2)) : null;
    private final JdbcTemplate jdbc;
    private final SamplePlaceCatalog samples;
    private final PlaceViewLoader loader;

    public PlaceRecordService(JdbcTemplate jdbc, SamplePlaceCatalog samples, PlaceViewLoader loader) {
        this.jdbc = jdbc;
        this.samples = samples;
        this.loader = loader;
    }

    /**
     * 샘플 장소와, 공개 기록이 있거나 내가 하트로 저장한 DB 장소를 함께 반환합니다.
     * 목록에는 공개 기록만 담고, 내 비공개 기록은 상세·내 기록 조회에서만 보여줍니다.
     */
    public List<PlaceView> findAll(String query, UUID viewerId) {
        Map<String, PlaceView> results = new LinkedHashMap<>();
        samples.findAll(query).forEach(place -> results.put(place.id(), place));
        String filter = query == null ? "" : query.trim();
        List<UUID> ids = jdbc.query("""
                SELECT DISTINCT p.place_id
                FROM restaurant_places p
                WHERE (EXISTS (SELECT 1 FROM restaurant_records r
                               WHERE r.place_id = p.place_id AND r.visibility = 'PUBLIC')
                       OR EXISTS (SELECT 1 FROM user_place_likes l
                                  WHERE l.place_id = p.place_id::text AND l.account_id = ?))
                  AND (? = '' OR p.place_name ILIKE '%' || ? || '%'
                       OR p.category ILIKE '%' || ? || '%' OR p.address ILIKE '%' || ? || '%')
                ORDER BY p.place_id
                """, (rs, row) -> rs.getObject(1, UUID.class), viewerId, filter, filter, filter, filter);
        loader.load(ids, viewerId, PlaceViewLoader.RecordScope.PUBLIC_ONLY)
                .forEach(place -> results.put(place.id(), place));
        return List.copyOf(results.values());
    }

    /** 내 기록함 전용 목록은 공개 여부와 관계없이 본인 기록만 반환합니다. */
    public List<PlaceView> findMine(UUID accountId) {
        List<UUID> ids = jdbc.query("""
                SELECT DISTINCT p.place_id
                FROM restaurant_places p
                JOIN restaurant_records r ON r.place_id = p.place_id
                WHERE r.account_id = ?
                ORDER BY p.place_id
                """, (rs, row) -> rs.getObject(1, UUID.class), accountId);
        return loader.load(ids, accountId, PlaceViewLoader.RecordScope.OWN_ONLY);
    }

    /** 최근 15일간 본 장소를 마지막 방문 순서로 반환합니다. */
    @Transactional
    public List<PlaceView> findRecent(UUID accountId) {
        jdbc.update("DELETE FROM user_recent_places WHERE viewed_at < now() - INTERVAL '15 days'");
        List<String> ids = jdbc.query("""
                SELECT place_id FROM user_recent_places
                WHERE account_id = ? AND viewed_at >= now() - INTERVAL '15 days'
                ORDER BY viewed_at DESC LIMIT 30
                """, (rs, row) -> rs.getString(1), accountId);
        // 샘플 장소와 DB 장소가 섞여 있으므로 DB 장소만 한 번에 불러온 뒤 최근 본 순서대로 다시 맞춥니다.
        List<UUID> databaseIds = ids.stream().filter(id -> samples.findById(id) == null)
                .map(PlaceRecordService::uuidOrNull).filter(Objects::nonNull).toList();
        Map<String, PlaceView> databasePlaces = new LinkedHashMap<>();
        loader.load(databaseIds, accountId, PlaceViewLoader.RecordScope.PUBLIC_AND_OWN)
                .forEach(place -> databasePlaces.put(place.id(), place));
        return ids.stream()
                .map(id -> samples.findById(id) != null ? samples.findById(id) : databasePlaces.get(id))
                .filter(Objects::nonNull).toList();
    }

    private static UUID uuidOrNull(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            return null;
        }
    }

    /** 장소가 현재 사용자에게 조회 가능한지 확인한 뒤 최근 본 목록에 기록합니다. */
    @Transactional
    public void rememberRecent(UUID accountId, String placeId) {
        if (placeId == null || placeId.isBlank() || placeId.length() > 100
                || findById(placeId, accountId) == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "최근 본 맛집을 찾을 수 없습니다.");
        }
        jdbc.update("""
                INSERT INTO user_recent_places(account_id, place_id, viewed_at)
                VALUES (?, ?, now())
                ON CONFLICT (account_id, place_id) DO UPDATE SET viewed_at = now()
                """, accountId, placeId);
        jdbc.update("DELETE FROM user_recent_places WHERE viewed_at < now() - INTERVAL '15 days'");
        jdbc.update("""
                DELETE FROM user_recent_places
                WHERE account_id = ? AND place_id NOT IN (
                    SELECT place_id FROM user_recent_places
                    WHERE account_id = ? ORDER BY viewed_at DESC LIMIT 30
                )
                """, accountId, accountId);
    }

    /** 로그인 계정별 임시 장소를 최근 저장 순으로 반환합니다. */
    public List<QuickPlaceDraftView> findDrafts(UUID accountId) {
        return jdbc.query("""
                SELECT provider_code, provider_place_id, place_name, category, address, latitude, longitude,
                       provider_phone, provider_url, road_address, lot_address, reg_dt
                FROM place_quick_drafts WHERE account_id = ? ORDER BY reg_dt DESC
                """, DRAFT_MAPPER, accountId);
    }

    /** 저장 버튼을 누르기 전에 이미 등록되었거나 임시 저장된 장소인지 확인합니다. */
    public QuickPlaceDuplicateView checkDraftDuplicate(UUID accountId, String providerCode, String providerPlaceId) {
        String provider = providerCode(providerCode);
        boolean alreadyRegistered = isRegisteredFor(accountId, provider, providerPlaceId);
        boolean alreadySaved = hasDraft(accountId, provider, providerPlaceId);
        String placeName = jdbc.query("""
                SELECT p.place_name FROM restaurant_places p
                JOIN restaurant_records r ON r.place_id = p.place_id
                WHERE p.provider_code = ? AND p.provider_place_id = ?
                  AND (r.account_id = ? OR r.visibility = 'PUBLIC')
                ORDER BY r.reg_dt DESC LIMIT 1
                """, rs -> rs.next() ? rs.getString(1) : null, provider, providerPlaceId, accountId);
        if (placeName == null) {
            placeName = jdbc.query("""
                    SELECT place_name FROM place_quick_drafts
                    WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?
                    """, rs -> rs.next() ? rs.getString(1) : null, accountId, provider, providerPlaceId);
        }
        return new QuickPlaceDuplicateView(alreadyRegistered, alreadySaved, placeName);
    }

    /** 본인 기록이나 다른 맛객의 공개 기록으로 이미 등록된 장소인지 확인합니다. */
    private boolean isRegisteredFor(UUID accountId, String provider, String providerPlaceId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM restaurant_places p
                    JOIN restaurant_records r ON r.place_id = p.place_id
                    WHERE p.provider_code = ? AND p.provider_place_id = ?
                      AND (r.account_id = ? OR r.visibility = 'PUBLIC')
                )
                """, Boolean.class, provider, providerPlaceId, accountId));
    }

    private boolean hasDraft(UUID accountId, String provider, String providerPlaceId) {
        return Boolean.TRUE.equals(jdbc.queryForObject("""
                SELECT EXISTS (
                    SELECT 1 FROM place_quick_drafts
                    WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?
                )
                """, Boolean.class, accountId, provider, providerPlaceId));
    }

    /** 같은 장소를 다시 임시 저장하면 한 행을 갱신해 중복 목록을 방지합니다. */
    @Transactional
    public QuickPlaceDraftView saveDraft(UUID accountId, QuickPlaceDraftRequest request) {
        if (request.latitude() < -90 || request.latitude() > 90 || request.longitude() < -180 || request.longitude() > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "장소 좌표를 확인해 주세요.");
        }
        String provider = providerCode(request.providerCode());
        if (isRegisteredFor(accountId, provider, request.providerPlaceId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 맛집으로 등록된 장소예요.");
        }
        if (hasDraft(accountId, provider, request.providerPlaceId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 빠른 기록에 저장된 장소예요.");
        }
        // 위 확인과 동시에 들어온 같은 요청은 ON CONFLICT로 한 행만 남깁니다.
        return jdbc.queryForObject("""
                INSERT INTO place_quick_drafts (draft_id, account_id, provider_code, provider_place_id, place_name, category,
                    address, latitude, longitude, provider_phone, provider_url, road_address, lot_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (account_id, provider_code, provider_place_id) DO UPDATE SET
                    place_name = EXCLUDED.place_name, category = EXCLUDED.category, address = EXCLUDED.address,
                    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                    provider_phone = EXCLUDED.provider_phone, provider_url = EXCLUDED.provider_url,
                    road_address = EXCLUDED.road_address, lot_address = EXCLUDED.lot_address, reg_dt = now()
                RETURNING provider_code, provider_place_id, place_name, category, address, latitude, longitude,
                          provider_phone, provider_url, road_address, lot_address, reg_dt
                """, DRAFT_MAPPER, UUID.randomUUID(), accountId,
                provider, request.providerPlaceId(), request.placeName(), request.category(), request.address(),
                request.latitude(), request.longitude(), request.providerPhone(),
                KakaoPlaceVerifier.safeUrl(request.providerUrl()), request.roadAddress(), request.lotAddress());
    }

    @Transactional
    public void deleteDraft(UUID accountId, String providerPlaceId, String providerCode) {
        jdbc.update("DELETE FROM place_quick_drafts WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?",
                accountId, providerCode(providerCode), providerPlaceId);
    }

    public PlaceView findById(String id, UUID viewerId) {
        PlaceView sample = samples.findById(id);
        if (sample != null) return sample;
        UUID placeId = uuidOrNull(id);
        if (placeId == null) return null;
        List<PlaceView> places = loader.load(List.of(placeId), viewerId, PlaceViewLoader.RecordScope.PUBLIC_AND_OWN);
        return places.isEmpty() ? null : places.get(0);
    }

    @Transactional
    public PlaceView createRecord(UUID accountId, CommunityProfileClient.AuthorProfile author,
                                  KakaoPlaceVerifier.PlaceInfo placeInfo, CreatePlaceRecordRequest request) {
        validate(request);
        // 가게 행은 여러 맛객의 기록이 함께 참조합니다. 카카오에서 직접 확인한 값일 때만 최신 기본정보로 갱신하고,
        // 확인하지 못한 요청 값은 새 가게일 때만 저장합니다. 분류는 맛객이 고른 음식 종류가 반영되므로 처음 값을 유지합니다.
        // 갱신하지 않을 때도 같은 값으로 UPDATE하는 것은 충돌 시 RETURNING으로 기존 place_id를 받기 위해서입니다.
        String onConflict = placeInfo.verified()
                ? """
                    place_name = EXCLUDED.place_name, address = EXCLUDED.address,
                    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                    provider_phone = EXCLUDED.provider_phone, provider_url = EXCLUDED.provider_url,
                    road_address = EXCLUDED.road_address, lot_address = EXCLUDED.lot_address, upd_dt = now()
                  """
                : "provider_code = restaurant_places.provider_code\n";
        UUID placeId = jdbc.queryForObject("""
                INSERT INTO restaurant_places (
                    place_id, provider_code, provider_place_id, place_name, category, address,
                    latitude, longitude, provider_phone, provider_url, road_address, lot_address
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (provider_code, provider_place_id) DO UPDATE SET
                """ + onConflict + """
                RETURNING place_id
                """, UUID.class, UUID.randomUUID(), providerCode(request.providerCode()), request.providerPlaceId(),
                placeInfo.placeName(), request.category(), placeInfo.address(), placeInfo.latitude(), placeInfo.longitude(),
                placeInfo.phone(), placeInfo.url(), placeInfo.roadAddress(), placeInfo.lotAddress());
        UUID recordId = jdbc.queryForObject("""
                INSERT INTO restaurant_records (
                    record_id, place_id, account_id, author_name, author_avatar_variant,
                    reason, visibility
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (account_id, place_id) DO UPDATE SET
                    author_name = EXCLUDED.author_name,
                    author_avatar_variant = EXCLUDED.author_avatar_variant,
                    reason = EXCLUDED.reason, visibility = EXCLUDED.visibility, upd_dt = now()
                RETURNING record_id
                """, UUID.class, UUID.randomUUID(), placeId, accountId, author.nickname().trim(),
                author.avatarVariant(), request.reason().trim(), request.visibility());

        List<UUID> existingMenuIds = jdbc.query("SELECT menu_id FROM restaurant_record_menus WHERE record_id = ?",
                (rs, row) -> rs.getObject(1, UUID.class), recordId);
        List<UUID> keptMenuIds = safe(request.menus()).stream()
                .map(menu -> menuPhotoReferenceId(menu.photo())).filter(Objects::nonNull).distinct().toList();
        for (UUID menuId : keptMenuIds) {
            Integer belongsToRecord = jdbc.queryForObject("SELECT count(*) FROM restaurant_record_menus WHERE menu_id = ? AND record_id = ? AND photo_data IS NOT NULL",
                    Integer.class, menuId, recordId);
            if (belongsToRecord == null || belongsToRecord == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "다른 맛집의 메뉴 사진은 수정 기록에 포함할 수 없습니다.");
            }
        }
        for (UUID menuId : existingMenuIds) {
            if (!keptMenuIds.contains(menuId)) jdbc.update("DELETE FROM restaurant_record_menus WHERE menu_id = ?", menuId);
        }
        // 사진과 같이 유지할 메뉴를 임시 순번으로 옮겨, 새 순서로 다시 매길 때 (record_id, sort_no) 고유 제약과 충돌하지 않게 합니다.
        for (int menuOrder = 0; menuOrder < keptMenuIds.size(); menuOrder++) {
            jdbc.update("UPDATE restaurant_record_menus SET sort_no = ? WHERE menu_id = ? AND record_id = ?",
                    1000 + menuOrder, keptMenuIds.get(menuOrder), recordId);
        }
        jdbc.update("DELETE FROM restaurant_record_tags WHERE record_id = ?", recordId);
        jdbc.update("DELETE FROM restaurant_record_visit_conditions WHERE record_id = ?", recordId);
        List<UUID> existingPhotoIds = jdbc.query("SELECT photo_id FROM restaurant_record_photos WHERE record_id = ?",
                (rs, row) -> rs.getObject(1, UUID.class), recordId);
        List<UUID> keptPhotoIds = safe(request.photos()).stream()
                .map(this::photoReferenceId).filter(Objects::nonNull).toList();
        for (int photoOrder = 0; photoOrder < keptPhotoIds.size(); photoOrder++) {
            jdbc.update("UPDATE restaurant_record_photos SET sort_no = ? WHERE photo_id = ? AND record_id = ?",
                    1000 + photoOrder, keptPhotoIds.get(photoOrder), recordId);
        }
        for (UUID photoId : existingPhotoIds) {
            if (!keptPhotoIds.contains(photoId)) jdbc.update("DELETE FROM restaurant_record_photos WHERE photo_id = ?", photoId);
        }
        int index = 0;
        for (CreatePlaceRecordRequest.MenuInput menu : safe(request.menus())) {
            UUID existingMenuId = menuPhotoReferenceId(menu.photo());
            if (existingMenuId != null) {
                jdbc.update("UPDATE restaurant_record_menus SET menu_name = ?, price_amt = ?, sort_no = ? WHERE menu_id = ? AND record_id = ?",
                        menu.name().trim(), menu.price(), index++, existingMenuId, recordId);
                continue;
            }
            Photo menuPhoto = menu.photo() == null || menu.photo().isBlank() ? null : decodePhoto(menu.photo());
            jdbc.update("""
                    INSERT INTO restaurant_record_menus(menu_id, record_id, menu_name, price_amt, sort_no, photo_data, photo_mime_type)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """, UUID.randomUUID(), recordId, menu.name().trim(), menu.price(), index++,
                    menuPhoto == null ? null : menuPhoto.bytes(), menuPhoto == null ? null : menuPhoto.mimeType());
        }
        for (String tag : safe(request.tags())) {
            if (!tag.isBlank()) {
                String group = request.tagGroups() == null ? null : request.tagGroups().get(tag);
                if (group == null || !List.of("CUISINE", "TASTE", "CAFE", "OCCASION").contains(group)) group = "TASTE";
                jdbc.update("INSERT INTO restaurant_record_tags(record_id, tag_name, tag_group) VALUES (?, ?, ?) ON CONFLICT (record_id, tag_name) DO UPDATE SET tag_group = EXCLUDED.tag_group", recordId, tag.trim(), group);
            }
        }
        for (String condition : safe(request.visitConditions())) {
            if (!condition.isBlank()) jdbc.update("INSERT INTO restaurant_record_visit_conditions(record_id, condition_name) VALUES (?, ?) ON CONFLICT DO NOTHING", recordId, condition.trim());
        }
        index = 0;
        for (String dataUrl : safe(request.photos())) {
            UUID existingPhotoId = photoReferenceId(dataUrl);
            if (existingPhotoId != null) {
                Integer belongsToRecord = jdbc.queryForObject("SELECT count(*) FROM restaurant_record_photos WHERE photo_id = ? AND record_id = ?",
                        Integer.class, existingPhotoId, recordId);
                if (belongsToRecord == null || belongsToRecord == 0) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "다른 맛집의 사진은 수정 기록에 포함할 수 없습니다.");
                }
                jdbc.update("UPDATE restaurant_record_photos SET sort_no = ? WHERE photo_id = ?", index, existingPhotoId);
                index++;
                continue;
            }
            Photo photo = decodePhoto(dataUrl);
            jdbc.update("""
                    INSERT INTO restaurant_record_photos(photo_id, record_id, photo_data, mime_type, sort_no)
                    VALUES (?, ?, ?, ?, ?)
                    """, UUID.randomUUID(), recordId, photo.bytes(), photo.mimeType(), index++);
        }
        jdbc.update("DELETE FROM place_quick_drafts WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?",
                accountId, providerCode(request.providerCode()), request.providerPlaceId());
        return findById(placeId.toString(), accountId);
    }

    /** 좋아요한 장소를 내 기록으로 전환하고, 원자적으로 기존 좋아요를 제거합니다. */
    @Transactional
    public PlaceView convertLikeToRecord(UUID accountId, CommunityProfileClient.AuthorProfile author,
                                         KakaoPlaceVerifier.PlaceInfo placeInfo,
                                         String sourcePlaceId, CreatePlaceRecordRequest request,
                                         boolean visitedConfirmed) {
        if (sourcePlaceId == null || sourcePlaceId.isBlank() || sourcePlaceId.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "전환할 내 맛집을 확인해 주세요.");
        }
        if (!visitedConfirmed) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "직접 방문을 확인한 뒤 맛집 기록으로 등록해 주세요.");
        }
        PlaceView created = createRecord(accountId, author, placeInfo, request);
        jdbc.update("DELETE FROM user_place_likes WHERE account_id = ? AND place_id IN (?, ?)",
                accountId, sourcePlaceId, created.id());
        return created;
    }

    /** 내 기록의 하위 입력값을 함께 삭제하고 같은 장소를 내 맛집으로 저장합니다. */
    @Transactional
    public void convertRecordToLike(UUID accountId, String placeIdValue) {
        UUID placeId;
        try {
            placeId = UUID.fromString(placeIdValue);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "전환할 맛집 정보를 확인해 주세요.");
        }
        int deleted = jdbc.update("DELETE FROM restaurant_records WHERE place_id = ? AND account_id = ?", placeId, accountId);
        if (deleted == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "내가 등록한 맛집 기록을 찾을 수 없습니다.");
        jdbc.update("""
                INSERT INTO user_place_likes(account_id, place_id, save_origin)
                VALUES (?, ?, 'VISITED')
                ON CONFLICT (account_id, place_id)
                DO UPDATE SET save_origin = 'VISITED'
                """,
                accountId, placeId.toString());
    }

    public List<String> likedPlaceIds(UUID accountId) {
        return jdbc.query("SELECT place_id FROM user_place_likes WHERE account_id = ? ORDER BY reg_dt DESC",
                (rs, row) -> rs.getString(1), accountId);
    }

    /** 직접 작성한 방문 기록을 내 맛집으로 옮긴 항목만 다시 기록 전환 대상으로 반환합니다. */
    public List<String> visitedLikedPlaceIds(UUID accountId) {
        return jdbc.query("SELECT place_id FROM user_place_likes WHERE account_id = ? AND save_origin = 'VISITED' ORDER BY reg_dt DESC",
                (rs, row) -> rs.getString(1), accountId);
    }

    @Transactional
    public void setLiked(UUID accountId, String placeId, boolean liked) {
        if (placeId == null || placeId.isBlank() || placeId.length() > 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "저장할 맛집을 확인해 주세요.");
        }
        if (liked) {
            try {
                UUID ownedPlaceId = UUID.fromString(placeId);
                Integer ownRecordCount = jdbc.queryForObject(
                        "SELECT count(*) FROM restaurant_records WHERE account_id = ? AND place_id = ?",
                        Integer.class, accountId, ownedPlaceId);
                if (ownRecordCount != null && ownRecordCount > 0) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "내가 등록한 맛집은 내 맛집으로 중복 저장할 수 없습니다.");
                }
            } catch (IllegalArgumentException ignored) {
                // 샘플 장소 ID는 UUID가 아니므로 기존 하트 저장을 허용합니다.
            }
            jdbc.update("INSERT INTO user_place_likes(account_id, place_id) VALUES (?, ?) ON CONFLICT DO NOTHING", accountId, placeId);
        } else {
            jdbc.update("DELETE FROM user_place_likes WHERE account_id = ? AND place_id = ?", accountId, placeId);
        }
    }

    public Photo findPublicPhoto(UUID photoId) {
        return jdbc.query("""
                SELECT ph.photo_data, ph.mime_type
                FROM restaurant_record_photos ph
                JOIN restaurant_records r ON r.record_id = ph.record_id
                WHERE ph.photo_id = ? AND r.visibility = 'PUBLIC'
                """, SINGLE_PHOTO, photoId);
    }

    /** 서명 주소로 검증된 요청에서만 사용합니다. 공개 여부와 관계없이 사진을 반환합니다. */
    public Photo findPhoto(UUID photoId) {
        return jdbc.query("SELECT photo_data, mime_type FROM restaurant_record_photos WHERE photo_id = ?",
                SINGLE_PHOTO, photoId);
    }

    /** 서명 주소로 검증된 요청에서만 사용합니다. 공개 여부와 관계없이 메뉴 사진을 반환합니다. */
    public Photo findMenuPhoto(UUID menuId) {
        return jdbc.query("""
                SELECT photo_data, photo_mime_type FROM restaurant_record_menus
                WHERE menu_id = ? AND photo_data IS NOT NULL
                """, SINGLE_PHOTO, menuId);
    }

    public Photo findPublicMenuPhoto(UUID menuId) {
        return jdbc.query("""
                SELECT m.photo_data, m.photo_mime_type
                FROM restaurant_record_menus m
                JOIN restaurant_records r ON r.record_id = m.record_id
                WHERE m.menu_id = ? AND m.photo_data IS NOT NULL AND r.visibility = 'PUBLIC'
                """, SINGLE_PHOTO, menuId);
    }

    private void validate(CreatePlaceRecordRequest request) {
        if (!"PRIVATE".equals(request.visibility()) && !"PUBLIC".equals(request.visibility())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "공개 범위를 확인해 주세요.");
        }
        if (request.latitude() < -90 || request.latitude() > 90 || request.longitude() < -180 || request.longitude() > 180) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "장소 좌표를 확인해 주세요.");
        }
        int photoBytes = 0;
        for (String image : safe(request.photos())) {
            if (photoReferenceId(image) == null) photoBytes += decodePhoto(image).bytes().length;
        }
        for (CreatePlaceRecordRequest.MenuInput menu : safe(request.menus())) {
            if (menu.photo() != null && !menu.photo().isBlank() && menuPhotoReferenceId(menu.photo()) == null) {
                photoBytes += decodePhoto(menu.photo()).bytes().length;
            }
        }
        if (photoBytes > 20 * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사진 전체 용량은 20MB 이하로 등록해 주세요.");
        }
    }

    /** 사업자별 ID namespace를 분리해 지도 제공자를 바꿔도 장소 중복을 섞지 않습니다. */
    private String providerCode(String value) {
        String normalized = value == null || value.isBlank() ? "KAKAO" : value.trim().toUpperCase(Locale.ROOT);
        if (!normalized.matches("[A-Z0-9_]{2,20}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "지도 정보 제공자를 확인해 주세요.");
        }
        return normalized;
    }

    private Photo decodePhoto(String dataUrl) {
        Matcher matcher = DATA_URL.matcher(dataUrl == null ? "" : dataUrl);
        if (!matcher.matches()) throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "등록할 사진 형식을 확인해 주세요.");
        byte[] bytes;
        try {
            bytes = Base64.getDecoder().decode(matcher.group(2));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "등록할 사진 데이터를 읽을 수 없습니다.");
        }
        if (bytes.length == 0 || bytes.length > MAX_PHOTO_BYTES) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "사진 한 장은 5MB 이하로 등록해 주세요.");
        }
        return new Photo(bytes, matcher.group(1));
    }

    private UUID photoReferenceId(String value) {
        return mediaReferenceId(PHOTO_REFERENCE, value, "수정할 사진 정보를 확인해 주세요.");
    }

    private UUID menuPhotoReferenceId(String value) {
        return mediaReferenceId(MENU_PHOTO_REFERENCE, value, "수정할 메뉴 사진 정보를 확인해 주세요.");
    }

    /** 기존 사진 주소면 사진 ID를, 새로 올린 data URL처럼 주소 형식이 아니면 null을 반환합니다. */
    private static UUID mediaReferenceId(Pattern pattern, String value, String invalidMessage) {
        Matcher matcher = pattern.matcher(value == null ? "" : value);
        if (!matcher.matches()) return null;
        try {
            return UUID.fromString(matcher.group(1));
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, invalidMessage);
        }
    }

    private <T> List<T> safe(List<T> values) { return values == null ? List.of() : values; }

    public record Photo(byte[] bytes, String mimeType) {}
}
