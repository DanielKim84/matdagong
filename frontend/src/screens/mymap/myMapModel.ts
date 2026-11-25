import { isMyTaster, isSameKakaoPlace, type MapKind, type Place, type Taster } from "../../models/place";
import { leadTaster, type PlaceContext } from "../discover/discoverModel";

/**
 * 내 지도(MyMapScreen)에 올릴 장소 계산입니다. React 없이 장소 목록만 다룹니다.
 * 내 지도에는 나와 관련된 곳만 둡니다: 내 기록(공개·나만 보기), 다녀온 곳(빠른 저장·기록한 적 있는 곳), 가볼 곳(하트).
 * 화면에서는 이것을 세 갈래(MyPlaceCategory)로만 부릅니다. 내 맛집 모음(me/myPlaceCollection)·나 탭도 같은 이름과 색을 씁니다.
 */

/**
 * 화면에서 부르는 내 장소의 세 갈래입니다(내 지도 칩·수·목록 이름표, 내 맛집 모음 칩, 나 탭 사진 모음이 같음).
 * - shared 공유 중: 다른 맛객에게도 보이는 내 기록(공개). 색은 --shared-*.
 * - visited 가본 곳: 다녀왔지만 공유하지 않은 곳(나만 보기 기록 + 기록 없이 빠른 저장한 곳·기록을 지운 곳). 색은 --visited-*.
 * - wish 가볼 곳: 하트로 저장한 곳. 코랄.
 */
export type MyPlaceCategory = "shared" | "visited" | "wish";
export const MY_PLACE_CATEGORY_LABELS: Record<MyPlaceCategory, string> = {
  shared: "공유 중",
  visited: "가본 곳",
  wish: "가볼 곳",
};
/** 위쪽 칩의 범위입니다. 전체 또는 세 갈래 중 하나입니다. */
export type MyMapScope = "all" | MyPlaceCategory;
/** 내 지도 장소의 종류입니다. 마커 종류(MapKind)와 같은 이름을 씁니다. */
export type MyMapKind = Extract<MapKind, "own" | "visited" | "liked">;
type MyMapPlace = { place: Place; kind: MyMapKind };
/** 나눌 재료입니다. knownPlaces는 다녀온 곳·하트의 장소 정보를 찾을 이미 받아 둔 장소 목록입니다. */
export type MyPlaceSources = {
  myRecords: Place[];
  knownPlaces: Place[];
  likedPlaceIds: string[];
  visitedPlaceIds: string[];
};

/** 내 기록이 있는 곳은 내 기록을, 아니면 발견처럼 믿을 만한 맛객의 기록을 카드·목록의 대표로 보여 줍니다. */
export function myLeadTaster(place: Place, ctx: PlaceContext): Taster | undefined {
  return place.tasters.find(isMyTaster) ?? leadTaster(place, ctx);
}

export const MY_MAP_SCOPES: { value: MyMapScope; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "wish", label: MY_PLACE_CATEGORY_LABELS.wish },
  { value: "visited", label: MY_PLACE_CATEGORY_LABELS.visited },
  { value: "shared", label: MY_PLACE_CATEGORY_LABELS.shared },
];

/** 내 기록이 나만 보기인지(공유하지 않은 내 기록). */
export function isPrivateRecord(place: Place): boolean {
  return place.tasters.some((taster) => isMyTaster(taster) && taster.visibility === "PRIVATE");
}

/** 장소 하나가 세 갈래 중 어디인지: 공개 내 기록은 공유 중, 나만 보기 기록과 다녀온 곳은 가본 곳, 하트는 가볼 곳입니다. */
export function categoryOf(entry: { place: Place; kind: MyMapKind }): MyPlaceCategory {
  if (entry.kind === "liked") return "wish";
  if (entry.kind === "own" && !isPrivateRecord(entry.place)) return "shared";
  return "visited";
}

/**
 * 내 기록이 있는 곳은 내 기록으로, 나머지는 다녀온 곳 → 가볼 곳 순서로 나눕니다(다녀온 곳에 하트가 있어도 다녀온 곳).
 * 장소 정보를 knownPlaces에서 찾지 못한 곳은 빼고, 다음 목록을 받을 때 나타납니다.
 */
export function myMapPlaces({ myRecords, knownPlaces, likedPlaceIds, visitedPlaceIds }: MyPlaceSources): MyMapPlace[] {
  const entries = new Map<string, MyMapPlace>();
  myRecords.forEach((place) => entries.set(place.id, { place, kind: "own" }));
  const byId = new Map(knownPlaces.map((place) => [place.id, place]));
  const add = (id: string, kind: MyMapKind) => {
    const place = byId.get(id);
    if (place && !entries.has(id)) entries.set(id, { place, kind });
  };
  visitedPlaceIds.forEach((id) => add(id, "visited"));
  likedPlaceIds.forEach((id) => add(id, "liked"));
  return [...entries.values()];
}

export function isInScope(entry: MyMapPlace, scope: MyMapScope): boolean {
  return scope === "all" || categoryOf(entry) === scope;
}

/** 같은 카카오 가게가 맛다공에 이미 있으면 그 장소입니다(맛객 기록이 있으면 그 기록을 보여 주는 상세로 잇기 위해). */
export function knownPlaceOf(result: KakaoPlaceResult, knownPlaces: Place[]): Place | undefined {
  return knownPlaces.find((place) => isSameKakaoPlace(place, result.id));
}
