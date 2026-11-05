package kr.matdagong.place.draft;

import static kr.matdagong.place.draft.QuickDraftModels.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import kr.matdagong.place.location.NearbyPlaceGuard;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 맛집 기록을 나중에 쓰려고 담아 둔 장소(빠른 기록)를 계정별로 저장·조회합니다. */
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

    private final JdbcTemplate jdbc;
    private final NearbyPlaceGuard nearby;

    public QuickDraftService(JdbcTemplate jdbc, NearbyPlaceGuard nearby) {
        this.jdbc = jdbc;
        this.nearby = nearby;
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
        String provider = PlaceIdentifiers.providerCode(providerCode);
        boolean alreadyRegistered = isRegisteredFor(accountId, provider, providerPlaceId);
        boolean alreadySaved = hasDraft(accountId, provider, providerPlaceId);
        String placeName = jdbc
                .query(
                        """
                        SELECT p.place_name FROM restaurant_places p
                        JOIN restaurant_records r ON r.place_id = p.place_id
                        WHERE p.provider_code = ? AND p.provider_place_id = ?
                          AND (r.account_id = ? OR r.visibility = 'PUBLIC')
                        ORDER BY r.reg_dt DESC LIMIT 1
                        """,
                        (rs, row) -> rs.getString("place_name"),
                        provider,
                        providerPlaceId,
                        accountId)
                .stream()
                .findFirst()
                .orElseGet(() -> draftPlaceName(accountId, provider, providerPlaceId));
        return new QuickPlaceDuplicateView(alreadyRegistered, alreadySaved, placeName);
    }

    /**
     * 같은 장소를 다시 임시 저장하면 한 행을 갱신해 중복 목록을 방지합니다. 빠른 저장은 그 가게에 들른 근거가 되므로 기기
     * 위치가 가게 1km 안일 때만 저장하고, 가게 정보는 호출하는 쪽이 카카오로 확인한 값(place)을 씁니다.
     */
    @Transactional
    public QuickPlaceDraftView saveDraft(UUID accountId, PlaceInfo place, QuickPlaceDraftRequest request) {
        String provider = PlaceIdentifiers.providerCode(request.providerCode());
        if (isRegisteredFor(accountId, provider, request.providerPlaceId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 내가 기록한 장소예요.");
        }
        if (hasDraft(accountId, provider, request.providerPlaceId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 빠른 기록에 저장된 장소예요.");
        }
        nearby.requireNearby(request.deviceLocation(), place, provider, request.providerPlaceId(), TOO_FAR);
        // 위 확인과 동시에 들어온 같은 요청은 ON CONFLICT로 한 행만 남깁니다.
        return jdbc.queryForObject(
                """
                INSERT INTO place_quick_drafts (draft_id, account_id, provider_code, provider_place_id, place_name, category,
                    address, latitude, longitude, provider_phone, provider_url, road_address, lot_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (account_id, provider_code, provider_place_id) DO UPDATE SET
                    place_name = EXCLUDED.place_name, category = EXCLUDED.category, address = EXCLUDED.address,
                    latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                    provider_phone = EXCLUDED.provider_phone, provider_url = EXCLUDED.provider_url,
                    road_address = EXCLUDED.road_address, lot_address = EXCLUDED.lot_address, reg_dt = now()
                RETURNING
                """
                        + DRAFT_COLUMNS,
                DRAFT_MAPPER,
                UUID.randomUUID(),
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

    /** 같은 장소를 빠른 저장해 두었는지 확인합니다. 빠른 저장에서 이어 쓰는 기록은 위치를 다시 확인하지 않습니다. */
    @Transactional(readOnly = true)
    public boolean hasDraft(UUID accountId, String providerCode, String providerPlaceId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM place_quick_drafts
                    WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?
                )
                """,
                Boolean.class,
                accountId,
                PlaceIdentifiers.providerCode(providerCode),
                providerPlaceId));
    }

    /** 사용자가 지우거나, 같은 장소로 맛집 기록을 저장하면 빠른 기록에서 뺍니다. */
    @Transactional
    public void deleteDraft(UUID accountId, String providerPlaceId, String providerCode) {
        jdbc.update(
                "DELETE FROM place_quick_drafts WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?",
                accountId,
                PlaceIdentifiers.providerCode(providerCode),
                providerPlaceId);
    }

    /**
     * 내가 이미 기록한 장소인지 확인합니다. 다른 맛객이 공개 기록한 가게도 빠른 저장할 수 있어야
     * 그 가게에 들른 근거가 남아 하트에서 '입맛에 맞았어요'를 고를 수 있습니다(경험 신뢰).
     */
    private boolean isRegisteredFor(UUID accountId, String provider, String providerPlaceId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM restaurant_places p
                    JOIN restaurant_records r ON r.place_id = p.place_id
                    WHERE p.provider_code = ? AND p.provider_place_id = ?
                      AND r.account_id = ?
                )
                """,
                Boolean.class,
                provider,
                providerPlaceId,
                accountId));
    }

    private String draftPlaceName(UUID accountId, String provider, String providerPlaceId) {
        return jdbc
                .query(
                        """
                        SELECT place_name FROM place_quick_drafts
                        WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?
                        """,
                        (rs, row) -> rs.getString("place_name"),
                        accountId,
                        provider,
                        providerPlaceId)
                .stream()
                .findFirst()
                .orElse(null);
    }
}
