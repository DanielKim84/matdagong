import { useAppData } from "../../app/AppData";
import { isMyTaster, type Place } from "../../models/place";
import { myMapPlaces, type MyMapKind, type MyPlaceSources } from "../mymap/myMapModel";

/**
 * 내 맛집 모음의 묶음 계산입니다. 내 지도(myMapPlaces)와 같은 기준으로 나누고, 내 기록만 공개·나만 보기로 한 번 더 나눕니다.
 * 한 장소는 내 기록 → 다녀온 곳 → 가보고 싶은 곳 순서로 한 묶음에만 들어갑니다.
 */

export type MyPlaceGroup = "mine" | "private" | "wish" | "visited";
type MyPlaceEntry = { place: Place; group: MyPlaceGroup };

export const MY_PLACE_GROUP_LABELS: Record<MyPlaceGroup, string> = {
  mine: "내가 등록한 곳",
  private: "나만 보기",
  wish: "가보고 싶은 곳",
  visited: "다녀온 곳",
};

const GROUP_OF_KIND: Record<Exclude<MyMapKind, "own">, MyPlaceGroup> = { visited: "visited", liked: "wish" };

function isPrivateRecord(place: Place): boolean {
  return place.tasters.some((taster) => isMyTaster(taster) && taster.visibility === "PRIVATE");
}

function myPlaceEntries(sources: MyPlaceSources): MyPlaceEntry[] {
  return myMapPlaces(sources).map(({ place, kind }) => ({
    place,
    group: kind === "own" ? (isPrivateRecord(place) ? "private" : "mine") : GROUP_OF_KIND[kind],
  }));
}

/**
 * 지금 앱 데이터로 만든 내 맛집 모음입니다. 나 탭의 "내 맛집 모음" 타일과 모음 화면이 같은 수를 보이도록 둘 다 이것을 씁니다.
 * 별로였던 곳은 "다녀왔는데 별로였어요"라 다녀온 곳으로도 셉니다(다녀온 곳 기록 없이 가게 근처에서 고른 곳 포함).
 */
export function useMyPlaceEntries(): MyPlaceEntry[] {
  const app = useAppData();
  return myPlaceEntries({
    myRecords: app.myRecords,
    knownPlaces: [...app.places, ...app.privatePlaces, ...app.myRecords, ...app.recentPlaces],
    likedPlaceIds: app.likedPlaceIds,
    visitedPlaceIds: [...new Set([...app.visitedPlaceIds, ...app.dislikedPlaceIds])],
  });
}
