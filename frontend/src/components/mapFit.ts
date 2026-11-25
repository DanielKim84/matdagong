/** 지도(MapCanvas)의 보이는 범위를 장소 목록이나 반경에 맞추는 계산입니다. */
import type { Place } from "../models/place";
import { boundsForRadius, type Coordinates } from "../utils/geo";

type KakaoMaps = Kakao["maps"];

/** 카카오 지도 중심을 패널을 제외한 실제 보이는 영역 기준으로 보정합니다. */
export function offsetKakaoMapForVisibleArea(map: MapInstance, offsetY: number): void {
  if (offsetY) map.panBy(0, offsetY);
}

// 핀(43×53px, 끝이 좌표)이 지도 가장자리에서 잘리지 않게 맞출 때 남기는 여백(px)입니다.
// 위는 핀 높이보다 조금 더, 양옆은 핀 폭의 절반보다 조금 더 둡니다(screens/discover/mapBounds.ts의 2/3 기준과 함께).
const PIN_FIT_PADDING = { top: 64, side: 32, bottom: 16 };

/** places가 모두 보이게 지도 범위를 맞춥니다. 한 곳뿐이면 넓은 배율 그대로 두지 않고 singlePlaceLevel로 가까이 가져갑니다. */
export function fitMapToPlaces(map: MapInstance, maps: KakaoMaps, places: Place[], singlePlaceLevel: number): void {
  if (!places.length) return;
  if (places.length === 1) {
    map.setLevel(singlePlaceLevel);
    map.setCenter(new maps.LatLng(places[0].latitude, places[0].longitude));
    return;
  }
  const bounds = new maps.LatLngBounds();
  places.forEach((place) => bounds.extend(new maps.LatLng(place.latitude, place.longitude)));
  map.setBounds(bounds, PIN_FIT_PADDING.top, PIN_FIT_PADDING.side, PIN_FIT_PADDING.bottom, PIN_FIT_PADDING.side);
}

/** center를 가운데 두고 meters 반경이 꼭 차게 지도 범위를 맞춥니다. */
export function fitMapToRadius(map: MapInstance, maps: KakaoMaps, center: Coordinates, meters: number): void {
  const range = boundsForRadius(center, meters);
  const bounds = new maps.LatLngBounds();
  bounds.extend(new maps.LatLng(range.south, range.west));
  bounds.extend(new maps.LatLng(range.north, range.east));
  map.setBounds(bounds);
}
