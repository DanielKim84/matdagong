package kr.matdagong.place.draft;

import static kr.matdagong.place.draft.QuickDraftModels.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.catalog.PlaceUpserts;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import kr.matdagong.place.location.NearbyPlaceGuard;
import kr.matdagong.place.visit.PlaceVisitService;
import kr.matdagong.place.visit.PlaceVisitService.VisitSource;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * 맛집 기록을 나중에 쓰려고 담아 둔 장소(빠른 기록)를 계정별로 저장·조회합니다. 빠른 저장은 가게 1km 안에서만 되고,
 * 저장한 가게는 다녀온 곳(PlaceVisitService)이 됩니다. 빠른 저장한 가게는 위치 확인 없이 기록할 수 있습니다
 * (PlaceRecordService가 확인).
 */
@Service
public class QuickDraftService {
    /** 목록 조회와 저장 결과(RETURNING)가 같은 칼럼을 DRAFT_MAPPER로 읽습니다. */
    private static final String DRAFT_COLUMNS =
            """
            provider_code, provider_place_id, place_name, category, address, latitude, longitude,
            provider_phone, provider_url, road_address, lot_address, reg_dt""";

    private static final RowMapper<QuickPlaceDraftView> DRAFT_MAPPER = (rs, row) -> new QuickPlaceDraftView(
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
            rs.getObject("reg_dt", OffsetDateTime.class));

    private static final String TOO_FAR = "현재 위치 1km 안의 장소만 저장할 수 있어요.";
    /** restaurant_places.category 칸 길이입니다. 빠른 저장의 분류(최대 200자)를 장소 행에 넣을 때 자릅니다. */
    private static final int PLACE_CATEGORY_LENGTH = 120;

    private final JdbcTemplate jdbc;
    private final NearbyPlaceGuard nearby;
    private final PlaceVisitService visits;

    public QuickDraftService(JdbcTemplate jdbc, NearbyPlaceGuard nearby, PlaceVisitService visits) {
        this.jdbc = jdbc;
        this.nearby = nearby;
        this.visits = visits;
    }

    /** 로그인 계정별 임시 장소를 최근 저장 순으로 반환합니다. */
    @Transactional(readOnly = true)
    public List<QuickPlaceDraftView> findDrafts(UUID accountId) {
        return jdbc.query(
                "SELECT " + DRAFT_COLUMNS + " FROM place_quick_drafts WHERE account_id = ? ORDER BY reg_dt DESC",
                DRAFT_MAPPER,
                accountId);
    }

    /** 저장 버튼을 누르기 전에 이미 등록되었거나 임시 저장된 장소인지 확인합니다. */
    @Transactional(readOnly = true)
    public QuickPlaceDuplicateView checkDuplicate(UUID accountId, String providerCode, String providerPlaceId) {
        return duplicateState(accountId, PlaceIdentifiers.providerCode(providerCode), providerPlaceId);
    }

    /**
     * 같은 장소를 다시 임시 저장하면 한 행을 갱신해 중복 목록을 방지합니다. 빠른 저장은 그 가게에 들른 근거가 되므로 기기
     * 위치가 가게 1km 안일 때만 저장하고, 가게 정보는 호출하는 쪽이 카카오로 확인한 값(place)을 씁니다.
     * 저장한 가게는 맛다공 장소로도 저장해 다녀온 곳으로 남깁니다(기록이 없으면 저장한 사람의 지도에만 보임).
     */
    @Transactional
    public QuickPlaceDraftView saveDraft(UUID accountId, PlaceInfo place, QuickPlaceDraftRequest request) {
        String provider = PlaceIdentifiers.providerCode(request.providerCode());
        QuickPlaceDuplicateView duplicate = duplicateState(accountId, provider, request.providerPlaceId());
        if (duplicate.alreadyRegistered()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 내가 기록한 장소예요.");
        }
        if (duplicate.alreadySaved()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 빠른 기록에 저장된 장소예요.");
        }
        nearby.requireNearby(request.deviceLocation(), place, provider, request.providerPlaceId(), TOO_FAR);
        UUID placeId = PlaceUpserts.upsert(
                jdbc, provider, request.providerPlaceId(), placeCategory(request.category()), place);
        visits.markVisited(accountId, placeId, VisitSource.QUICK_SAVE);
        // 위 확인과 동시에 들어온 같은 요청은 ON CONFLICT로 한 행만 남깁니다.
        return jdbc.queryForObject(
                """
                INSERT INTO place_quick_drafts (account_id, provider_code, provider_place_id, place_name, category,
                    address, latitude, longitude, provider_phone, provider_url, road_address, lot_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (account_id, provider_code, provider_place_id) DO UPDATE SET
                    place_name = EXCLUDED.place_name, category = EXCLUDED.category, address = EXCLUDED.address,
                    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                    provider_phone = EXCLUDED.provider_phone, provider_url = EXCLUDED.provider_url,
                    road_address = EXCLUDED.road_address, lot_address = EXCLUDED.lot_address, reg_dt = now()
                RETURNING
                """
                        + DRAFT_COLUMNS,
                DRAFT_MAPPER,
                accountId,
                provider,
                request.providerPlaceId(),
                place.placeName(),
                request.category(),
                place.address(),
                place.latitude(),
                place.longitude(),
                place.phone(),
                place.url(),
                place.roadAddress(),
                place.lotAddress());
    }

    /** 사용자가 빠른 기록을 지웁니다. 빠른 저장으로만 다녀온 곳이 된 가게는 다녀온 곳에서도 뺍니다(기록한 적이 있으면 남김). */
    @Transactional
    public void discardDraft(UUID accountId, String providerCode, String providerPlaceId) {
        deleteDraft(accountId, providerCode, providerPlaceId);
        visits.forgetQuickSave(accountId, providerCode, providerPlaceId);
    }

    /** 같은 장소로 맛집 기록을 저장하면 빠른 기록에서 뺍니다(다녀온 곳은 기록이 이어받음). */
    @Transactional
    public void deleteDraft(UUID accountId, String providerCode, String providerPlaceId) {
        jdbc.update(
                "DELETE FROM place_quick_drafts WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?",
                accountId,
                PlaceIdentifiers.providerCode(providerCode),
                providerPlaceId);
    }

    /**
     * 내가 이미 기록한 장소인지, 빠른 기록에 담았는지, 보여 줄 가게 이름을 한 번에 봅니다. 이름은 내 기록이나 공개 기록이 있는
     * 가게의 이름을 먼저, 없으면 빠른 기록에 담은 이름을 씁니다.
     * 다른 맛객이 공개 기록한 가게도 빠른 저장할 수 있어야 그 가게에 들른 근거(다녀온 곳)가 남아 나중에 위치 확인 없이
     * 기록하거나 '별로였어요'를 고를 수 있으므로, 이미 등록된 곳으로 보는 것은 내 기록뿐입니다.
     */
    private QuickPlaceDuplicateView duplicateState(UUID accountId, String provider, String providerPlaceId) {
        return jdbc.queryForObject(
                """
                WITH place AS (
                    SELECT place_id, place_name FROM restaurant_places WHERE provider_code = ? AND provider_place_id = ?
                ),
                draft AS (
                    SELECT place_name FROM place_quick_drafts
                    WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?
                )
                SELECT EXISTS (
                           SELECT 1 FROM place JOIN restaurant_records r ON r.place_id = place.place_id
                           WHERE r.account_id = ?
                       ) AS already_registered,
                       EXISTS (SELECT 1 FROM draft) AS already_saved,
                       COALESCE(
                           (SELECT place.place_name FROM place WHERE EXISTS (
                               SELECT 1 FROM restaurant_records r
                               WHERE r.place_id = place.place_id AND (r.account_id = ? OR r.visibility = 'PUBLIC'))),
                           (SELECT place_name FROM draft)
                       ) AS place_name
                """,
                (rs, row) -> new QuickPlaceDuplicateView(
                        rs.getBoolean("already_registered"),
                        rs.getBoolean("already_saved"),
                        rs.getString("place_name")),
                provider,
                providerPlaceId,
                accountId,
                provider,
                providerPlaceId,
                accountId,
                accountId);
    }

    private static String placeCategory(String draftCategory) {
        if (draftCategory == null) return "";
        return draftCategory.substring(0, Math.min(draftCategory.length(), PLACE_CATEGORY_LENGTH));
    }
}
