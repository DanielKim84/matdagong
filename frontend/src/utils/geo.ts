export type Coordinates = { latitude: number; longitude: number };

const EARTH_RADIUS_METERS = 6_371_000;

/** 두 좌표 사이의 지표면 거리(m)를 하버사인 공식으로 계산합니다. */
export function distanceMeters(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

/** 카카오 장소 검색 결과는 좌표를 문자열(x=경도, y=위도)로 돌려줍니다. */
export function kakaoPlaceCoordinates(place: KakaoPlaceResult): Coordinates {
  return { latitude: Number(place.y), longitude: Number(place.x) };
}
