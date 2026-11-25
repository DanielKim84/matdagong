package kr.matdagong.place.catalog;

import java.util.UUID;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * 가게 기본정보(restaurant_places)를 제공처 장소 ID 기준으로 하나만 두고 저장합니다. 기록 저장과 가볼 곳 저장이 함께 씁니다.
 * 가게 행은 여러 맛객의 기록이 함께 참조합니다. 카카오에서 직접 확인한 값일 때만 최신 기본정보로 갱신하고,
 * 확인하지 못한 요청 값은 새 가게일 때만 저장합니다. 분류는 제공처가 준 글자 그대로 넣고 처음 값을 유지합니다(화면이 줄여 보여 줌).
 * 갱신하지 않을 때도 같은 값으로 UPDATE하는 것은 충돌 시 RETURNING으로 기존 place_id를 받기 위해서입니다.
 */
public final class PlaceUpserts {
    private PlaceUpserts() {}

    public static UUID upsert(
            JdbcTemplate jdbc, String providerCode, String providerPlaceId, String category, PlaceInfo placeInfo) {
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
                PlaceIdentifiers.providerCode(providerCode),
                providerPlaceId,
                placeInfo.placeName(),
                category,
                placeInfo.address(),
                placeInfo.latitude(),
                placeInfo.longitude(),
                placeInfo.phone(),
                placeInfo.url(),
                placeInfo.roadAddress(),
                placeInfo.lotAddress());
    }
}
