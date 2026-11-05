/** 맛객 프로필 맛집 지도(TasterMapCard)의 범위 칩 계산입니다. */
import type { Place, Taster } from "../../models/place";
import { shortSidoName } from "../../models/region";
import { distanceMeters, type Coordinates } from "../../utils/geo";
import { NEARBY_RADIUS_METERS } from "./tasterData";

/** 지도 위 칩 하나: 전체, 내 주변, 시·도별 묶음. places는 그 칩을 누르면 지도에 꽉 차게 맞출 장소입니다. */
export type MapScope = { key: string; label: string; places: Place[] };

export const ALL_SCOPE_KEY = "all";
export const NEARBY_SCOPE_KEY = "near";

/** 기록한 곳을 시·도로 묶어 기록이 많은 순으로 돌려줍니다. 주소에서 시·도를 못 찾으면 '기타'입니다. */
export function regionScopes(places: Place[]): MapScope[] {
  const groups = new Map<string, Place[]>();
  places.forEach((place) => {
    const region = shortSidoName(place.address) ?? "기타";
    groups.set(region, [...(groups.get(region) ?? []), place]);
  });
  return [...groups.entries()]
    .map(([region, items]) => ({ key: region, label: region, places: items }))
    .sort((left, right) => right.places.length - left.places.length || left.label.localeCompare(right.label, "ko"));
}

/** 내 위치에서 맛객 탭 "내 주변"과 같은 거리(NEARBY_RADIUS_METERS) 안의 기록입니다. 있으면 '내 주변' 칩을 보여 줍니다. */
export function nearbyPlaces(places: Place[], position: Coordinates | null): Place[] {
  if (!position) return [];
  return places.filter((place) => distanceMeters(position, place) <= NEARBY_RADIUS_METERS);
}

/**
 * 처음 보여 줄 칩. 동네 위주 맛객은 주 활동 지역(없으면 기록이 가장 많은 지역)을 꽉 차게 보여 주고,
 * 여행 위주·동네와 여행 모두인 맛객은 전국을 다니는 스타일 자체가 정보라 전체를 보여 줍니다.
 */
export function defaultScopeKey(taster: Pick<Taster, "activityScope" | "activityRegion">, regions: MapScope[]): string {
  if (taster.activityScope !== "LOCAL" || regions.length < 2) return ALL_SCOPE_KEY;
  const home = shortSidoName(taster.activityRegion);
  return regions.find((region) => region.key === home)?.key ?? regions[0].key;
}
