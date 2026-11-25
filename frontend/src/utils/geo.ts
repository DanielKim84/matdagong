/** 좌표 자료형과 거리 계산, 지금 위치 한 번 받기, 카카오 장소 결과의 좌표·주소입니다. */
export type Coordinates = { latitude: number; longitude: number };
type GeoBounds = { south: number; west: number; north: number; east: number };

const EARTH_RADIUS_METERS = 6_371_000;

/** 두 좌표 사이의 지표면 거리(m)를 하버사인 공식으로 계산합니다. */
export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

/** center를 가운데 두고 meters 반경이 꼭 들어오는 지도 범위입니다. 지도 이동과 반경별 결과 미리보기가 함께 씁니다. */
export function boundsForRadius(center: Coordinates, meters: number): GeoBounds {
  const latitudeDelta = meters / 111_320;
  const longitudeDelta = meters / (111_320 * Math.cos((center.latitude * Math.PI) / 180));
  return {
    south: center.latitude - latitudeDelta,
    west: center.longitude - longitudeDelta,
    north: center.latitude + latitudeDelta,
    east: center.longitude + longitudeDelta,
  };
}

/** 지도·맛객 탭처럼 위치를 자주 묻는 곳은 5분 안에 얻은 위치면 다시 묻지 않습니다. */
export const RECENT_POSITION_MS = 5 * 60_000;

/**
 * 지금 기기 위치를 한 번 받습니다. 대략의 위치로 충분해 빠른 응답을 고르고(10초까지 기다림),
 * maximumAge(기본 1분) 안에 얻은 위치면 그대로 씁니다.
 */
export function currentPosition(maximumAge = 60_000): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("이 기기에서는 현재 위치를 확인할 수 없어요."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => reject(new Error("현재 위치를 확인하지 못했어요.")),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge },
    );
  });
}

/** 카카오 장소 검색 결과는 좌표를 문자열(x=경도, y=위도)로 돌려줍니다. */
export function kakaoPlaceCoordinates(place: KakaoPlaceResult): Coordinates {
  return { latitude: Number(place.y), longitude: Number(place.x) };
}

/** 카카오 장소 결과에서 보여 줄 주소입니다. 도로명 주소가 없으면 지번 주소를 씁니다. */
export function kakaoPlaceAddress(place: KakaoPlaceResult): string {
  return place.road_address_name || place.address_name;
}

/** 위치 권한 상태입니다. 브라우저가 권한 확인을 지원하지 않으면 "unknown"입니다. */
export type LocationPermission = "granted" | "prompt" | "denied" | "unknown";

/**
 * 위치 권한 상태를 알려 주고, 사용자가 설정에서 바꾸면 다시 알려 줍니다. 돌려준 함수로 그만 듣습니다.
 * 발견의 위치 권한 없음 안내(보드 18-01)와, 권한이 켜지면 바로 내 위치를 잡는 useMyLocation이 함께 씁니다.
 */
export function watchLocationPermission(onChange: (permission: LocationPermission) => void): () => void {
  let status: PermissionStatus | null = null;
  let isActive = true;
  const notify = () => status && onChange(status.state as LocationPermission);
  if (!navigator.permissions?.query) {
    onChange("unknown");
    return () => undefined;
  }
  navigator.permissions
    .query({ name: "geolocation" })
    .then((result) => {
      if (!isActive) return;
      status = result;
      notify();
      result.addEventListener("change", notify);
    })
    .catch(() => isActive && onChange("unknown"));
  return () => {
    isActive = false;
    status?.removeEventListener("change", notify);
  };
}
