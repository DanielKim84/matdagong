import { useAppData } from "../../app/AppData";
import type { Place } from "../../models/place";
import { categoryOf, myMapPlaces, type MyPlaceCategory, type MyPlaceSources } from "../mymap/myMapModel";

/**
 * 내 맛집 모음의 묶음 계산입니다. 내 지도(myMapPlaces · categoryOf)와 같은 세 갈래(공유 중 · 가본 곳 · 가볼 곳)로 나눕니다.
 * 한 장소는 내 기록 → 다녀온 곳 → 가볼 곳 순서로 한 갈래에만 들어갑니다. hasRecord는 내 기록이 있는 곳(공유 범위를 바꿀 수 있는 곳)입니다.
 */
type MyPlaceEntry = { place: Place; group: MyPlaceCategory; hasRecord: boolean };

function myPlaceEntries(sources: MyPlaceSources): MyPlaceEntry[] {
  return myMapPlaces(sources).map((entry) => ({
    place: entry.place,
    group: categoryOf(entry),
    hasRecord: entry.kind === "own",
  }));
}

/**
 * 지금 앱 데이터로 만든 내 맛집 모음입니다. 나 탭의 사진 모음과 모음 화면이 같은 수를 보이도록 둘 다 이것을 씁니다.
 * 별로였던 곳은 "다녀왔는데 별로였어요"라 가본 곳으로도 셉니다(다녀온 곳 기록 없이 가게 근처에서 고른 곳 포함).
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
