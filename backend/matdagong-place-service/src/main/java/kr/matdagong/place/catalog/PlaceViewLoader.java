package kr.matdagong.place.catalog;

import static kr.matdagong.place.catalog.PlaceModels.*;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import kr.matdagong.common.jdbc.JdbcArrays;
import kr.matdagong.place.media.MediaUrlSigner;
import kr.matdagong.place.profile.HiddenTasters;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * DB에 저장된 장소와 맛객별 기록을 화면 응답으로 조립합니다.
 * DB가 멀리 있어 쿼리를 오가는 횟수가 응답 시간을 좌우하므로, 장소(기록 수 포함) 한 번, 기록(메뉴·태그·방문 조건·사진
 * 포함) 한 번, 모두 두 번만 조회합니다. 사진 바이트는 읽지 않고 주소만 응답에 담습니다.
 * 신고가 쌓여 가려진 맛객의 기록은 본인에게만 보입니다.
 */
@Component
public class PlaceViewLoader {
    /** 응답에 포함할 기록 범위입니다. 비공개 기록은 조회하는 사람 본인의 것만 포함합니다. */
    public enum RecordScope {
        PUBLIC_ONLY,
        PUBLIC_AND_OWN,
        OWN_ONLY
    }

    private final JdbcTemplate jdbc;
    private final MediaUrlSigner signer;
    private final HiddenTasters hiddenTasters;

    public PlaceViewLoader(JdbcTemplate jdbc, MediaUrlSigner signer, HiddenTasters hiddenTasters) {
        this.jdbc = jdbc;
        this.signer = signer;
        this.hiddenTasters = hiddenTasters;
    }

    /** 요청한 순서를 유지해 장소 목록을 반환하며, 없는 장소 ID는 결과에서 빠집니다. */
    public List<PlaceView> load(List<UUID> placeIds, UUID viewerId, RecordScope scope) {
        if (placeIds.isEmpty()) return List.of();
        String[] placeIdArray = JdbcArrays.uuidParam(placeIds);
        String[] hiddenIds = hiddenTasters.idsExcept(viewerId);

        Map<UUID, PlaceRow> places = new HashMap<>();
        jdbc.query(
                """
                SELECT p.place_id, p.provider_code, p.provider_place_id, p.place_name, p.category, p.address,
                       p.latitude, p.longitude, p.provider_phone, p.provider_url, p.road_address, p.lot_address,
                       (SELECT count(*) FROM restaurant_records r
                        WHERE r.place_id = p.place_id AND %s AND NOT (r.account_id = ANY(?::uuid[]))) AS record_count
                FROM restaurant_places p WHERE p.place_id = ANY(?::uuid[])
                """
                        .formatted(countFilter(scope)),
                rs -> {
                    UUID placeId = rs.getObject("place_id", UUID.class);
                    places.put(
                            placeId,
                            new PlaceRow(
                                    placeId,
                                    rs.getString("provider_code"),
                                    rs.getString("provider_place_id"),
                                    rs.getString("place_name"),
                                    rs.getString("category"),
                                    rs.getString("address"),
                                    rs.getDouble("latitude"),
                                    rs.getDouble("longitude"),
                                    rs.getString("provider_phone"),
                                    rs.getString("provider_url"),
                                    rs.getString("road_address"),
                                    rs.getString("lot_address"),
                                    rs.getInt("record_count")));
                },
                placeArgs(placeIdArray, viewerId, scope, hiddenIds));

        Map<UUID, List<TasterRecordView>> authorsByPlace = loadRecords(placeIdArray, viewerId, scope, hiddenIds);
        List<PlaceView> result = new ArrayList<>();
        for (UUID placeId : placeIds) {
            PlaceRow place = places.get(placeId);
            if (place == null) continue;
            List<TasterRecordView> authors = authorsByPlace.getOrDefault(placeId, List.of());
            List<String> conditions = authors.stream()
                    .flatMap(author -> author.visitConditions().stream())
                    .distinct()
                    .toList();
            result.add(new PlaceView(
                    place.placeId().toString(),
                    place.name(),
                    place.category(),
                    place.address(),
                    place.latitude(),
                    place.longitude(),
                    place.recordCount(),
                    conditions,
                    authors,
                    place.providerCode(),
                    place.providerPlaceId(),
                    place.phone(),
                    place.url(),
                    place.roadAddress(),
                    place.lotAddress()));
        }
        return result;
    }

    /**
     * 기록과 하위 데이터(메뉴·태그·방문 조건·사진)를 기록마다 배열로 모아 한 번에 읽습니다. 각 하위 표는 record_id로
     * 시작하는 색인이 있어 기록별 LATERAL 조회가 색인으로 끝납니다. 장소마다 최신 기록부터 담습니다(화면은 첫 기록을 대표로 씀).
     */
    private Map<UUID, List<TasterRecordView>> loadRecords(
            String[] placeIds, UUID viewerId, RecordScope scope, String[] hiddenIds) {
        Map<UUID, List<TasterRecordView>> authorsByPlace = new LinkedHashMap<>();
        jdbc.query(
                """
                SELECT r.record_id, r.place_id, r.account_id, r.author_name, r.reason, r.visibility, r.reg_dt,
                       menus.menu_ids, menus.menu_names, menus.prices, menus.has_photos,
                       tags.tag_names, tags.tag_groups, conditions.condition_names, photos.photo_ids
                FROM restaurant_records r
                LEFT JOIN LATERAL (
                    SELECT array_agg(m.menu_id ORDER BY m.sort_no) AS menu_ids,
                           array_agg(m.menu_name ORDER BY m.sort_no) AS menu_names,
                           array_agg(m.price_amt ORDER BY m.sort_no) AS prices,
                           array_agg(m.photo_data IS NOT NULL ORDER BY m.sort_no) AS has_photos
                    FROM restaurant_record_menus m WHERE m.record_id = r.record_id
                ) menus ON true
                LEFT JOIN LATERAL (
                    SELECT array_agg(t.tag_name ORDER BY t.tag_name) AS tag_names,
                           array_agg(t.tag_group ORDER BY t.tag_name) AS tag_groups
                    FROM restaurant_record_tags t WHERE t.record_id = r.record_id
                ) tags ON true
                LEFT JOIN LATERAL (
                    SELECT array_agg(c.condition_name ORDER BY c.condition_name) AS condition_names
                    FROM restaurant_record_visit_conditions c WHERE c.record_id = r.record_id
                ) conditions ON true
                LEFT JOIN LATERAL (
                    SELECT array_agg(ph.photo_id ORDER BY ph.sort_no) AS photo_ids
                    FROM restaurant_record_photos ph WHERE ph.record_id = r.record_id
                ) photos ON true
                WHERE r.place_id = ANY(?::uuid[]) AND %s AND NOT (r.account_id = ANY(?::uuid[]))
                ORDER BY r.reg_dt DESC
                """
                        .formatted(recordFilter(scope)),
                rs -> {
                    UUID placeId = rs.getObject("place_id", UUID.class);
                    authorsByPlace
                            .computeIfAbsent(placeId, key -> new ArrayList<>())
                            .add(recordView(rs));
                },
                recordArgs(placeIds, viewerId, scope, hiddenIds));
        return authorsByPlace;
    }

    private TasterRecordView recordView(ResultSet rs) throws SQLException {
        RecordVisibility visibility = RecordVisibility.valueOf(rs.getString("visibility"));

        List<UUID> menuIds = JdbcArrays.uuids(rs, "menu_ids");
        List<String> menuNames = JdbcArrays.strings(rs, "menu_names");
        List<Integer> prices = JdbcArrays.integers(rs, "prices");
        List<Boolean> hasPhotos = JdbcArrays.booleans(rs, "has_photos");
        List<MenuView> menus = new ArrayList<>();
        for (int index = 0; index < menuIds.size(); index++) {
            String photo =
                    hasPhotos.get(index) ? mediaUrl(MediaUrlSigner.MENU_PHOTO, menuIds.get(index), visibility) : null;
            menus.add(new MenuView(menuNames.get(index), prices.get(index), photo));
        }

        List<String> tags = JdbcArrays.strings(rs, "tag_names");
        List<String> tagGroupNames = JdbcArrays.strings(rs, "tag_groups");
        Map<String, String> tagGroups = new LinkedHashMap<>();
        for (int index = 0; index < tags.size(); index++) {
            tagGroups.put(tags.get(index), tagGroupNames.get(index));
        }

        List<String> photos = new ArrayList<>();
        for (UUID photoId : JdbcArrays.uuids(rs, "photo_ids")) {
            photos.add(mediaUrl(MediaUrlSigner.RECORD_PHOTO, photoId, visibility));
        }

        return new TasterRecordView(
                rs.getObject("account_id", UUID.class).toString(),
                rs.getString("author_name"),
                rs.getString("reason"),
                menus,
                tags,
                tagGroups,
                JdbcArrays.strings(rs, "condition_names"),
                photos,
                visibility,
                rs.getObject("reg_dt", OffsetDateTime.class).toString());
    }

    /** 공개 기록 사진은 누구나 열 수 있는 주소를, 본인의 비공개 기록 사진은 만료되는 서명 주소를 씁니다. */
    private String mediaUrl(String kind, UUID id, RecordVisibility visibility) {
        return visibility == RecordVisibility.PUBLIC ? MediaUrlSigner.publicUrl(kind, id) : signer.signedUrl(kind, id);
    }

    private static String recordFilter(RecordScope scope) {
        return switch (scope) {
            case PUBLIC_ONLY -> "r.visibility = 'PUBLIC'";
            case PUBLIC_AND_OWN -> "(r.visibility = 'PUBLIC' OR r.account_id = ?)";
            case OWN_ONLY -> "r.account_id = ?";
        };
    }

    /**
     * 장소별 기록 수는 공개 기록만, 또는 공개 기록과 본인 기록을 셉니다.
     * 내 기록함(OWN_ONLY)에서도 다른 맛객의 공개 기록 수까지 보여주므로 기록 필터와 다릅니다.
     */
    private static String countFilter(RecordScope scope) {
        return scope == RecordScope.PUBLIC_ONLY
                ? "r.visibility = 'PUBLIC'"
                : "(r.visibility = 'PUBLIC' OR r.account_id = ?)";
    }

    /** 장소 쿼리 자리표시자: [기록 수 필터의 조회자 ID], 가려진 맛객 ID, 장소 ID. PUBLIC_ONLY만 조회자 ID가 없습니다. */
    private static Object[] placeArgs(String[] placeIds, UUID viewerId, RecordScope scope, String[] hiddenIds) {
        return scope == RecordScope.PUBLIC_ONLY
                ? new Object[] {hiddenIds, placeIds}
                : new Object[] {viewerId, hiddenIds, placeIds};
    }

    /** 기록 쿼리 자리표시자: 장소 ID, [기록 필터의 조회자 ID], 가려진 맛객 ID. PUBLIC_ONLY만 조회자 ID가 없습니다. */
    private static Object[] recordArgs(String[] placeIds, UUID viewerId, RecordScope scope, String[] hiddenIds) {
        return scope == RecordScope.PUBLIC_ONLY
                ? new Object[] {placeIds, hiddenIds}
                : new Object[] {placeIds, viewerId, hiddenIds};
    }

    private record PlaceRow(
            UUID placeId,
            String providerCode,
            String providerPlaceId,
            String name,
            String category,
            String address,
            double latitude,
            double longitude,
            String phone,
            String url,
            String roadAddress,
            String lotAddress,
            int recordCount) {}
}
