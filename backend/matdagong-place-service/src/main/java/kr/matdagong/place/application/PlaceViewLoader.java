package kr.matdagong.place.application;

import static kr.matdagong.place.api.PlaceView.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import kr.matdagong.place.api.PlaceView;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * DB에 저장된 장소와 맛객별 기록을 화면 응답으로 조립합니다.
 * 장소·기록마다 쿼리를 반복하지 않도록 하위 데이터는 ID 배열로 한 번씩 조회하고,
 * 사진 바이트는 읽지 않고 주소만 응답에 담습니다.
 */
@Component
class PlaceViewLoader {
    /** 응답에 포함할 기록 범위입니다. 비공개 기록은 조회하는 사람 본인의 것만 포함합니다. */
    enum RecordScope { PUBLIC_ONLY, PUBLIC_AND_OWN, OWN_ONLY }

    private final JdbcTemplate jdbc;
    private final MediaUrlSigner signer;

    PlaceViewLoader(JdbcTemplate jdbc, MediaUrlSigner signer) {
        this.jdbc = jdbc;
        this.signer = signer;
    }

    /** 요청한 순서를 유지해 장소 목록을 반환하며, 없는 장소 ID는 결과에서 빠집니다. */
    List<PlaceView> load(List<UUID> placeIds, UUID viewerId, RecordScope scope) {
        if (placeIds.isEmpty()) return List.of();
        String[] placeIdArray = ids(placeIds);

        Map<UUID, PlaceRow> places = new HashMap<>();
        jdbc.query("""
                SELECT place_id, provider_code, provider_place_id, place_name, category, address,
                       latitude, longitude, provider_phone, provider_url, road_address, lot_address
                FROM restaurant_places WHERE place_id = ANY(?::uuid[])
                """, rs -> {
            UUID placeId = rs.getObject("place_id", UUID.class);
            places.put(placeId, new PlaceRow(placeId, rs.getString("provider_code"), rs.getString("provider_place_id"),
                    rs.getString("place_name"), rs.getString("category"), rs.getString("address"),
                    rs.getDouble("latitude"), rs.getDouble("longitude"), rs.getString("provider_phone"),
                    rs.getString("provider_url"), rs.getString("road_address"), rs.getString("lot_address")));
        }, (Object) placeIdArray);

        List<RecordRow> records = jdbc.query("""
                SELECT record_id, place_id, account_id, author_name, reason, visibility
                FROM restaurant_records
                WHERE place_id = ANY(?::uuid[]) AND %s
                ORDER BY reg_dt DESC
                """.formatted(recordFilter(scope)), (rs, row) -> new RecordRow(
                rs.getObject("record_id", UUID.class), rs.getObject("place_id", UUID.class),
                rs.getObject("account_id", UUID.class), rs.getString("author_name"),
                rs.getString("reason"), rs.getString("visibility")), filterArgs(placeIdArray, viewerId, scope));

        Map<UUID, Integer> recordCounts = new HashMap<>();
        jdbc.query("""
                SELECT place_id, count(*) FROM restaurant_records
                WHERE place_id = ANY(?::uuid[]) AND %s
                GROUP BY place_id
                """.formatted(countFilter(scope)), rs -> {
            recordCounts.put(rs.getObject(1, UUID.class), rs.getInt(2));
        }, filterArgs(placeIdArray, viewerId, scope));

        Map<UUID, List<TasterRecordView>> authorsByPlace = loadAuthors(records, viewerId);
        List<PlaceView> result = new ArrayList<>();
        for (UUID placeId : placeIds) {
            PlaceRow place = places.get(placeId);
            if (place == null) continue;
            List<TasterRecordView> authors = authorsByPlace.getOrDefault(placeId, List.of());
            String latestNote = authors.isEmpty() ? "" : authors.get(0).note();
            List<String> conditions = authors.stream().flatMap(author -> author.visitConditions().stream()).distinct().toList();
            // emoji·강조색·방문일·광고 여부는 샘플 장소용 표시 값이라 DB 장소에는 고정 기본값을 넣습니다.
            result.add(new PlaceView(place.placeId().toString(), place.name(), place.category(), place.address(),
                    place.latitude(), place.longitude(), "", "#e9d8c8", LocalDate.now().toString(), latestNote,
                    recordCounts.getOrDefault(placeId, 0), conditions, false, authors,
                    place.providerCode(), place.providerPlaceId(), place.phone(), place.url(), place.roadAddress(), place.lotAddress()));
        }
        return result;
    }

    private Map<UUID, List<TasterRecordView>> loadAuthors(List<RecordRow> records, UUID viewerId) {
        if (records.isEmpty()) return Map.of();
        String[] recordIds = ids(records.stream().map(RecordRow::recordId).toList());
        Map<UUID, String> visibilityByRecord = new HashMap<>();
        records.forEach(record -> visibilityByRecord.put(record.recordId(), record.visibility()));

        Map<UUID, List<MenuView>> menus = new HashMap<>();
        jdbc.query("""
                SELECT menu_id, record_id, menu_name, price_amt, (photo_data IS NOT NULL) AS has_photo
                FROM restaurant_record_menus WHERE record_id = ANY(?::uuid[]) ORDER BY record_id, sort_no
                """, rs -> {
            UUID recordId = rs.getObject("record_id", UUID.class);
            String photo = rs.getBoolean("has_photo")
                    ? mediaUrl(MediaUrlSigner.MENU_PHOTO, rs.getObject("menu_id", UUID.class), visibilityByRecord.get(recordId))
                    : null;
            menus.computeIfAbsent(recordId, key -> new ArrayList<>())
                    .add(new MenuView(rs.getString("menu_name"), (Integer) rs.getObject("price_amt"), photo));
        }, (Object) recordIds);

        Map<UUID, List<String>> tags = new HashMap<>();
        Map<UUID, Map<String, String>> tagGroups = new HashMap<>();
        jdbc.query("""
                SELECT record_id, tag_name, tag_group FROM restaurant_record_tags
                WHERE record_id = ANY(?::uuid[]) ORDER BY record_id, tag_name
                """, rs -> {
            UUID recordId = rs.getObject("record_id", UUID.class);
            tags.computeIfAbsent(recordId, key -> new ArrayList<>()).add(rs.getString("tag_name"));
            tagGroups.computeIfAbsent(recordId, key -> new LinkedHashMap<>()).put(rs.getString("tag_name"), rs.getString("tag_group"));
        }, (Object) recordIds);

        Map<UUID, List<String>> conditions = new HashMap<>();
        jdbc.query("""
                SELECT record_id, condition_name FROM restaurant_record_visit_conditions
                WHERE record_id = ANY(?::uuid[]) ORDER BY record_id, condition_name
                """, rs -> {
            conditions.computeIfAbsent(rs.getObject("record_id", UUID.class), key -> new ArrayList<>())
                    .add(rs.getString("condition_name"));
        }, (Object) recordIds);

        Map<UUID, List<String>> photos = new HashMap<>();
        jdbc.query("""
                SELECT photo_id, record_id FROM restaurant_record_photos
                WHERE record_id = ANY(?::uuid[]) ORDER BY record_id, sort_no
                """, rs -> {
            UUID recordId = rs.getObject("record_id", UUID.class);
            photos.computeIfAbsent(recordId, key -> new ArrayList<>())
                    .add(mediaUrl(MediaUrlSigner.RECORD_PHOTO, rs.getObject("photo_id", UUID.class), visibilityByRecord.get(recordId)));
        }, (Object) recordIds);

        // 맛객별 등록 장소 수: 다른 맛객은 공개 기록만, 본인은 비공개 기록까지 셉니다.
        Map<UUID, Integer> placeCounts = new HashMap<>();
        jdbc.query("""
                SELECT account_id, count(DISTINCT place_id) FROM restaurant_records
                WHERE account_id = ANY(?::uuid[]) AND (visibility = 'PUBLIC' OR account_id = ?)
                GROUP BY account_id
                """, rs -> {
            placeCounts.put(rs.getObject(1, UUID.class), rs.getInt(2));
        }, ids(records.stream().map(RecordRow::accountId).distinct().toList()), viewerId);

        Map<UUID, List<TasterRecordView>> authorsByPlace = new LinkedHashMap<>();
        for (RecordRow record : records) {
            List<String> recordTags = tags.getOrDefault(record.recordId(), List.of());
            authorsByPlace.computeIfAbsent(record.placeId(), key -> new ArrayList<>()).add(new TasterRecordView(
                    record.accountId().toString(), record.authorName(), String.join(" · ", recordTags), "", "",
                    record.reason(), menus.getOrDefault(record.recordId(), List.of()), recordTags,
                    tagGroups.getOrDefault(record.recordId(), Map.of()),
                    conditions.getOrDefault(record.recordId(), List.of()),
                    photos.getOrDefault(record.recordId(), List.of()), record.visibility(),
                    placeCounts.getOrDefault(record.accountId(), 0)));
        }
        return authorsByPlace;
    }

    /** 공개 기록 사진은 누구나 열 수 있는 주소를, 본인의 비공개 기록 사진은 만료되는 서명 주소를 씁니다. */
    private String mediaUrl(String kind, UUID id, String visibility) {
        return "PUBLIC".equals(visibility) ? "/media/%s/%s".formatted(kind, id) : signer.signedUrl(kind, id);
    }

    private static String recordFilter(RecordScope scope) {
        return switch (scope) {
            case PUBLIC_ONLY -> "visibility = 'PUBLIC'";
            case PUBLIC_AND_OWN -> "(visibility = 'PUBLIC' OR account_id = ?)";
            case OWN_ONLY -> "account_id = ?";
        };
    }

    /**
     * 장소별 기록 수는 공개 기록만, 또는 공개 기록과 본인 기록을 셉니다.
     * 내 기록함(OWN_ONLY)에서도 다른 맛객의 공개 기록 수까지 보여주므로 기록 필터와 다릅니다.
     */
    private static String countFilter(RecordScope scope) {
        return scope == RecordScope.PUBLIC_ONLY ? "visibility = 'PUBLIC'" : "(visibility = 'PUBLIC' OR account_id = ?)";
    }

    /** 두 필터 모두 PUBLIC_ONLY일 때만 조회자 ID 자리표시자가 없습니다. */
    private static Object[] filterArgs(String[] placeIds, UUID viewerId, RecordScope scope) {
        return scope == RecordScope.PUBLIC_ONLY ? new Object[] {placeIds} : new Object[] {placeIds, viewerId};
    }

    private static String[] ids(Collection<UUID> ids) {
        return ids.stream().map(UUID::toString).toArray(String[]::new);
    }

    private record PlaceRow(UUID placeId, String providerCode, String providerPlaceId, String name, String category,
                            String address, double latitude, double longitude, String phone, String url,
                            String roadAddress, String lotAddress) {}

    private record RecordRow(UUID recordId, UUID placeId, UUID accountId, String authorName, String reason,
                             String visibility) {}
}
