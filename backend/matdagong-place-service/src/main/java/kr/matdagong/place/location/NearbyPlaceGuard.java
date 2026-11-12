package kr.matdagong.place.location;

import java.util.UUID;
import kr.matdagong.place.catalog.PlaceIdentifiers;
import kr.matdagong.place.kakao.KakaoPlaceVerifier.PlaceInfo;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

/**
 * 다녀왔다는 근거(빠른 저장·새 맛집 기록·별로였어요)를 남길 때 기기가 가게 가까이에 있는지 확인합니다.
 * 트랜잭션은 부르는 Service가 열고, 이 클래스는 그 안에서만 불립니다.
 */
@Component
public class NearbyPlaceGuard {
    /**
     * 직접 다녀온 곳으로 인정하는 기기와 가게 사이 거리(m)입니다. 화면 models/place.ts의 VISIT_RADIUS_METERS, 약관
     * (policyDocuments.ts)의 안내와 맞춥니다. 안내 문구는 숫자를 따로 쓰지 않고 MAX_VISIT_DISTANCE_LABEL을 씁니다.
     */
    public static final double MAX_VISIT_DISTANCE_METERS = 1000;
    /** 오류 문구에 넣는 거리 표시("1km")입니다. */
    public static final String MAX_VISIT_DISTANCE_LABEL = Math.round(MAX_VISIT_DISTANCE_METERS / 1000) + "km";

    public static final String LOCATION_REQUIRED = "현재 위치를 확인할 수 없어요. 위치 권한을 켜고 다시 시도해 주세요.";

    private final JdbcTemplate jdbc;

    public NearbyPlaceGuard(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /**
     * 기기 위치가 없거나 가게에서 1km보다 멀면 400으로 거부합니다.
     *
     * @param tooFarMessage 화면마다 안내 문구가 달라 부르는 쪽이 정합니다.
     */
    public void requireNearby(
            DeviceLocation device, PlaceInfo place, String providerCode, String providerPlaceId, String tooFarMessage) {
        if (device == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, LOCATION_REQUIRED);
        }
        Coordinate target = placeCoordinate(place, providerCode, providerPlaceId);
        double distance =
                GeoDistance.meters(device.latitude(), device.longitude(), target.latitude(), target.longitude());
        if (distance > MAX_VISIT_DISTANCE_METERS) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, tooFarMessage);
        }
    }

    /**
     * 카카오로 확인한 좌표를 먼저 씁니다. 확인하지 못했으면(카카오 키 없음·카카오 장애·다른 지도 제공자) 이미 등록된 가게는
     * 저장된 좌표를 씁니다. 기록 저장도 확인하지 못한 요청 값으로 기존 가게를 바꾸지 않으므로 같은 원칙입니다. 처음 보는
     * 가게만 요청 좌표를 그대로 씁니다.
     */
    private Coordinate placeCoordinate(PlaceInfo place, String providerCode, String providerPlaceId) {
        if (place.verified()) return new Coordinate(place.latitude(), place.longitude());
        return jdbc
                .query(
                        """
                        SELECT latitude, longitude FROM restaurant_places
                        WHERE provider_code = ? AND provider_place_id = ?
                        """,
                        (rs, row) -> new Coordinate(rs.getDouble("latitude"), rs.getDouble("longitude")),
                        PlaceIdentifiers.providerCode(providerCode),
                        providerPlaceId)
                .stream()
                .findFirst()
                .orElseGet(() -> new Coordinate(place.latitude(), place.longitude()));
    }

    /**
     * 이미 저장된 가게(장소 ID)와 기기가 1km 안인지 봅니다. 방문 근거가 없는 가게에서 '별로였어요'를 고를 때 지금 위치를
     * 근거로 씁니다. DB에 없는 장소는 멀리 있는 것으로 봅니다.
     */
    public boolean isNearby(DeviceLocation device, UUID placeId) {
        if (device == null) return false;
        return jdbc
                .query(
                        "SELECT latitude, longitude FROM restaurant_places WHERE place_id = ?",
                        (rs, row) -> GeoDistance.meters(
                                device.latitude(),
                                device.longitude(),
                                rs.getDouble("latitude"),
                                rs.getDouble("longitude")),
                        placeId)
                .stream()
                .findFirst()
                .map(distance -> distance <= MAX_VISIT_DISTANCE_METERS)
                .orElse(false);
    }

    private record Coordinate(double latitude, double longitude) {}
}
