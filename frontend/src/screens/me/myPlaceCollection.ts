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

export function myPlaceEntries(sources: MyPlaceSources): MyPlaceEntry[] {
  return myMapPlaces(sources).map(({ place, kind }) => ({
    place,
    group: kind === "own" ? (isPrivateRecord(place) ? "private" : "mine") : GROUP_OF_KIND[kind],
  }));
}
