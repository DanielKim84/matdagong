import { isMyTaster, type MapKind, type Place } from "../../models/place";

/**
 * 내 지도(MyMapScreen)에 올릴 장소 계산입니다. React 없이 장소 목록만 다룹니다.
 * 내 지도에는 나와 관련된 곳만 둡니다: 내 기록(공개·나만 보기), 기록 없이 '다녀왔어요'로 하트한 곳, 가볼 곳(가 보고 싶어요 하트).
 */

/** 위쪽 칩의 범위입니다. 가본 곳 = 내 기록 + 다녀왔어요 하트. */
export type MyMapScope = "all" | "wish" | "visited";
/** 내 지도 장소의 종류입니다. 마커 종류(MapKind)와 같은 이름을 씁니다. */
export type MyMapKind = Extract<MapKind, "own" | "visited" | "liked">;
export type MyMapPlace = { place: Place; kind: MyMapKind };

export const MY_MAP_SCOPES: { value: MyMapScope; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "wish", label: "가볼 곳" },
  { value: "visited", label: "가본 곳" },
];

/** 카드·목록에 붙이는 종류 이름입니다. 내 기록은 공개 범위까지 밝힙니다. */
export function myMapKindLabel(entry: MyMapPlace): string {
  if (entry.kind === "liked") return "가볼 곳";
  if (entry.kind === "visited") return "다녀온 곳";
  const isPrivate = entry.place.tasters.some((taster) => isMyTaster(taster) && taster.visibility === "PRIVATE");
  return isPrivate ? "내 기록 · 나만 보기" : "내 기록";
}

/**
 * 내 기록이 있는 곳은 내 기록으로, 나머지 하트한 곳은 다녀왔어요·가볼 곳으로 나눕니다.
 * 하트한 장소의 정보는 이미 받아 둔 장소 목록(지도 목록·최근 본 곳)에서 찾고, 찾지 못한 곳은 다음 목록을 받을 때 나타납니다.
 */
export function myMapPlaces({
  myRecords,
  knownPlaces,
  likedPlaceIds,
  visitedLikedPlaceIds,
}: {
  myRecords: Place[];
  knownPlaces: Place[];
  likedPlaceIds: string[];
  visitedLikedPlaceIds: string[];
}): MyMapPlace[] {
  const entries = new Map<string, MyMapPlace>();
  myRecords.forEach((place) => entries.set(place.id, { place, kind: "own" }));
  const visited = new Set(visitedLikedPlaceIds);
  const byId = new Map(knownPlaces.map((place) => [place.id, place]));
  likedPlaceIds.forEach((id) => {
    const place = byId.get(id);
    if (!place || entries.has(id)) return;
    entries.set(id, { place, kind: visited.has(id) ? "visited" : "liked" });
  });
  return [...entries.values()];
}

export function isInScope(entry: MyMapPlace, scope: MyMapScope): boolean {
  if (scope === "wish") return entry.kind === "liked";
  if (scope === "visited") return entry.kind !== "liked";
  return true;
}

/** 카카오 검색 결과를 지도에 잠깐 올릴 장소 모양으로 바꿉니다. 아직 저장하지 않은 가게라 ID 앞에 kakao:를 붙입니다. */
export function placeFromKakao(result: KakaoPlaceResult): Place {
  return {
    id: `kakao:${result.id}`,
    providerCode: "KAKAO",
    providerPlaceId: result.id,
    name: result.place_name,
    category: result.category_name,
    address: result.road_address_name || result.address_name,
    roadAddress: result.road_address_name || undefined,
    lotAddress: result.address_name || undefined,
    providerPhone: result.phone || undefined,
    providerUrl: result.place_url || undefined,
    latitude: Number(result.y),
    longitude: Number(result.x),
    recentNote: "",
    recordCount: 0,
    tasters: [],
  };
}

/** 같은 카카오 가게가 맛다공에 이미 있으면 그 장소입니다(맛객 기록 수를 보여 주고 상세로 잇기 위해). */
export function knownPlaceOf(result: KakaoPlaceResult, knownPlaces: Place[]): Place | undefined {
  return knownPlaces.find((place) => place.providerPlaceId === result.id);
}

/** 내 기록을 뺀 맛객 기록 수입니다. */
export function otherRecordCount(place: Place | undefined): number {
  return place ? place.tasters.filter((taster) => !isMyTaster(taster)).length : 0;
}
