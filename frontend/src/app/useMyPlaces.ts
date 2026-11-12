import { useCallback, useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import {
  MY_ACTIVITY_CHANGED_EVENT,
  getDislikedPlaceIds,
  getLikedPlaceIds,
  getMyPlaceRecords,
  getPlaces,
  getRecentPlaces,
  getVisitedPlaceIds,
} from "../services/places";
import type { Place, Screen } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import { RETRY_LATER_MESSAGE, type AppNotice } from "./AppData";

/** 내 요약(기록·하트·다녀온 곳·별로였던 곳·최근 본 곳)을 다시 읽을 화면입니다. */
const MY_SUMMARY_SCREENS: Screen[] = ["my", "recent", "saved", "disliked"];

type Options = {
  accessToken: string;
  screen: Screen;
  notify: (notice: AppNotice) => void;
  /** 내 요약을 다시 읽을 때 공개 장소 목록도 함께 바꿉니다. */
  setPlaces: Dispatch<SetStateAction<Place[]>>;
  /** 내 요약을 다시 읽은 뒤 커뮤니티 정보(맛객 신뢰 %, 포인트 등)도 맞춥니다. */
  refreshCommunity: () => Promise<void>;
};

/**
 * 내 맛집 상태(내 기록, 최근 본 곳, 하트, 다녀온 곳, 별로였던 곳, 가게에 들른 근거)입니다.
 * 처음 그릴 때 불러오고, 나 탭·모음·별로였던 곳 화면에 들어오거나 빠른 저장 같은 활동이 끝나면(MY_ACTIVITY_CHANGED_EVENT)
 * 다시 읽습니다.
 * 바꾸는 동작은 돌려준 setter로 App과 하트 선택이 맞춥니다.
 */
export function useMyPlaces({ accessToken, screen, notify, setPlaces, refreshCommunity }: Options) {
  const [myPlaceRecords, setMyPlaceRecords] = useState<Place[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<Place[]>([]);
  const [likedPlaceIds, setLikedPlaceIds] = useState<string[]>([]);
  const [visitedPlaceIds, setVisitedPlaceIds] = useState<string[]>([]);
  const [dislikedPlaceIds, setDislikedPlaceIds] = useState<string[]>([]);
  // 가게에 들른 근거: 다녀온 곳(빠른 저장·기록이 늘 함께 남김)과 별로였던 곳입니다.
  // 장소 서비스 PlaceLikeService.requireVisitProof가 같은 두 목록으로 다시 확인합니다.
  const visitProofPlaceIds = useMemo(
    () => [...new Set([...visitedPlaceIds, ...dislikedPlaceIds])],
    [visitedPlaceIds, dislikedPlaceIds],
  );

  useEffect(() => {
    let active = true;
    Promise.all([getMyPlaceRecords(accessToken), getLikedPlaceIds(accessToken)])
      .then(([records, likedIds]) => {
        if (!active) return;
        setMyPlaceRecords(records);
        setLikedPlaceIds(likedIds);
      })
      .catch((cause: unknown) => {
        if (active)
          notify({
            kind: "error",
            title: "내 맛집 기록을 불러오지 못했어요",
            message: errorMessage(cause, RETRY_LATER_MESSAGE),
          });
      });
    // 다녀온 곳·별로였던 곳은 못 받아도 다른 내 맛집 목록은 보이도록 따로 받습니다.
    Promise.all([getVisitedPlaceIds(accessToken), getDislikedPlaceIds(accessToken)])
      .then(([visitedIds, dislikedIds]) => {
        if (!active) return;
        setVisitedPlaceIds(visitedIds);
        setDislikedPlaceIds(dislikedIds);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [accessToken, notify]);

  useEffect(() => {
    let active = true;
    getRecentPlaces(accessToken)
      .then((items) => {
        if (active) setRecentPlaces(items);
      })
      .catch((cause: unknown) => {
        if (active)
          notify({
            kind: "error",
            title: "최근 본 맛집을 불러오지 못했어요",
            message: errorMessage(cause, RETRY_LATER_MESSAGE),
          });
      });
    return () => {
      active = false;
    };
  }, [accessToken, notify]);

  const refreshMySummary = useCallback(async () => {
    const [records, likedIds, visitedIds, dislikedIds, recent, placeList] = await Promise.allSettled([
      getMyPlaceRecords(accessToken),
      getLikedPlaceIds(accessToken),
      // 빠른 저장·기록을 하면 다녀온 곳이 되므로 함께 다시 읽어, 그 가게를 바로 기록하거나 '별로였어요'를 고를 수 있게 합니다.
      getVisitedPlaceIds(accessToken),
      getDislikedPlaceIds(accessToken),
      getRecentPlaces(accessToken),
      getPlaces(accessToken, ""),
    ]);
    if (records.status === "fulfilled") setMyPlaceRecords(records.value);
    if (likedIds.status === "fulfilled") setLikedPlaceIds(likedIds.value);
    if (visitedIds.status === "fulfilled") setVisitedPlaceIds(visitedIds.value);
    if (dislikedIds.status === "fulfilled") setDislikedPlaceIds(dislikedIds.value);
    if (recent.status === "fulfilled") setRecentPlaces(recent.value);
    if (placeList.status === "fulfilled") setPlaces(placeList.value);
    await refreshCommunity();
  }, [accessToken, refreshCommunity, setPlaces]);

  useEffect(() => {
    if (MY_SUMMARY_SCREENS.includes(screen)) void refreshMySummary().catch(() => {});
    const refreshAfterActivityChange = () => void refreshMySummary().catch(() => {});
    window.addEventListener(MY_ACTIVITY_CHANGED_EVENT, refreshAfterActivityChange);
    return () => window.removeEventListener(MY_ACTIVITY_CHANGED_EVENT, refreshAfterActivityChange);
  }, [screen, refreshMySummary]);

  return {
    myPlaceRecords,
    setMyPlaceRecords,
    recentPlaces,
    setRecentPlaces,
    likedPlaceIds,
    setLikedPlaceIds,
    visitedPlaceIds,
    setVisitedPlaceIds,
    dislikedPlaceIds,
    setDislikedPlaceIds,
    visitProofPlaceIds,
  };
}
