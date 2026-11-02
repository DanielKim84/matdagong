package kr.matdagong.place.draft;

import static kr.matdagong.place.draft.QuickDraftModels.*;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.kakao.KakaoPlaceVerifier;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/** 맛집 기록을 나중에 쓰려고 담아 둔 장소(빠른 기록)를 계정별로 저장·조회합니다. */
@Service
public class QuickDraftService {
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

    private final JdbcTemplate jdbc;

    public QuickDraftService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** 로그인 계정별 임시 장소를 최근 저장 순으로 반환합니다. */
    @Transactional(readOnly = true)
    public List<QuickPlaceDraftView> findDrafts(UUID accountId) {
        return jdbc.query(
                """
                SELECT provider_code, provider_place_id, place_name, category, address, latitude, longitude,
                       provider_phone, provider_url, road_address, lot_address, reg_dt
                FROM place_quick_drafts WHERE account_id = ? ORDER BY reg_dt DESC
                """,
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

    /** 같은 장소를 다시 임시 저장하면 한 행을 갱신해 중복 목록을 방지합니다. */
    @Transactional
    public QuickPlaceDraftView saveDraft(UUID accountId, QuickPlaceDraftRequest request) {
        String provider = PlaceIdentifiers.providerCode(request.providerCode());
        if (isRegisteredFor(accountId, provider, request.providerPlaceId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 맛집으로 등록된 장소예요.");
        }
        if (hasDraft(accountId, provider, request.providerPlaceId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "이미 빠른 기록에 저장된 장소예요.");
        }
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
                RETURNING provider_code, provider_place_id, place_name, category, address, latitude, longitude,
                          provider_phone, provider_url, road_address, lot_address, reg_dt
                """,
                DRAFT_MAPPER,
                UUID.randomUUID(),
                accountId,
                provider,
                request.providerPlaceId(),
                request.placeName(),
                request.category(),
                request.address(),
                request.latitude(),
                request.longitude(),
                request.providerPhone(),
                KakaoPlaceVerifier.safeUrl(request.providerUrl()),
                request.roadAddress(),
                request.lotAddress());
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

    /** 본인 기록이나 다른 맛객의 공개 기록으로 이미 등록된 장소인지 확인합니다. */
    private boolean isRegisteredFor(UUID accountId, String provider, String providerPlaceId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM restaurant_places p
                    JOIN restaurant_records r ON r.place_id = p.place_id
                    WHERE p.provider_code = ? AND p.provider_place_id = ?
                      AND (r.account_id = ? OR r.visibility = 'PUBLIC')
                )
                """,
                Boolean.class,
                provider,
                providerPlaceId,
                accountId));
    }

    private boolean hasDraft(UUID accountId, String provider, String providerPlaceId) {
        return Boolean.TRUE.equals(jdbc.queryForObject(
                """
                SELECT EXISTS (
                    SELECT 1 FROM place_quick_drafts
                    WHERE account_id = ? AND provider_code = ? AND provider_place_id = ?
                )
                """,
                Boolean.class,
                accountId,
                provider,
                providerPlaceId));
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
