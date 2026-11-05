/** 지도(MapCanvas)의 보이는 범위를 장소 목록이나 반경에 맞추는 계산입니다. */
import type { Place } from "../models/place";
import type { Coordinates } from "../utils/geo";

type KakaoMaps = Kakao["maps"];

// 위도 1도의 길이(m). 반경을 위도·경도 차이로 바꿀 때 씁니다.
const METERS_PER_LATITUDE_DEGREE = 111_320;

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
  map.setBounds(bounds);
}

/** center를 가운데 두고 meters 반경이 꼭 차게 지도 범위를 맞춥니다. */
export function fitMapToRadius(map: MapInstance, maps: KakaoMaps, center: Coordinates, meters: number): void {
  const latitudeDelta = meters / METERS_PER_LATITUDE_DEGREE;
  const longitudeDelta = meters / (METERS_PER_LATITUDE_DEGREE * Math.cos((center.latitude * Math.PI) / 180));
  const bounds = new maps.LatLngBounds();
  bounds.extend(new maps.LatLng(center.latitude - latitudeDelta, center.longitude - longitudeDelta));
  bounds.extend(new maps.LatLng(center.latitude + latitudeDelta, center.longitude + longitudeDelta));
  map.setBounds(bounds);
}
