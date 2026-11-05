import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  MY_ACTIVITY_CHANGED_EVENT,
  getDislikedPlaceIds,
  getLikedPlaceIds,
  getMyPlaceRecords,
  getPlaces,
  getRecentPlaces,
  getVisitProofPlaceIds,
  getVisitedLikedPlaceIds,
} from "../services/places";
import type { Place, Screen } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import { RETRY_LATER_MESSAGE, type AppNotice } from "./AppData";

/** 내 요약(기록·하트·최근 본 장소)을 다시 읽어야 하는 화면입니다. */
const MY_SUMMARY_SCREENS: Screen[] = ["my", "recent", "saved", "liked", "my-records"];

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
 * 내 맛집 상태(내 기록, 최근 본 곳, 하트, 별로였던 곳, 가게에 들른 근거)입니다.
 * 처음 그릴 때 불러오고, 마이·모음 화면에 들어오거나 빠른 저장 같은 활동이 끝나면(MY_ACTIVITY_CHANGED_EVENT) 다시 읽습니다.
 * 바꾸는 동작은 돌려준 setter로 App과 하트 선택이 맞춥니다.
 */
export function useMyPlaces({ accessToken, screen, notify, setPlaces, refreshCommunity }: Options) {
  const [myPlaceRecords, setMyPlaceRecords] = useState<Place[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<Place[]>([]);
  const [likedPlaceIds, setLikedPlaceIds] = useState<string[]>([]);
  const [visitedLikedPlaceIds, setVisitedLikedPlaceIds] = useState<string[]>([]);
  const [dislikedPlaceIds, setDislikedPlaceIds] = useState<string[]>([]);
  const [visitProofPlaceIds, setVisitProofPlaceIds] = useState<string[]>([]);

  const setMyPlaceState = useCallback((records: Place[], likedIds: string[], visitedLikedIds: string[]) => {
    setMyPlaceRecords(records);
    setLikedPlaceIds(likedIds);
    setVisitedLikedPlaceIds(visitedLikedIds);
  }, []);

  useEffect(() => {
    let active = true;
    Promise.all([getMyPlaceRecords(accessToken), getLikedPlaceIds(accessToken), getVisitedLikedPlaceIds(accessToken)])
      .then(([records, likedIds, visitedLikedIds]) => {
        if (active) setMyPlaceState(records, likedIds, visitedLikedIds);
      })
      .catch((cause: unknown) => {
        if (active)
          notify({
            kind: "error",
            title: "내 맛집 기록을 불러오지 못했어요",
            message: errorMessage(cause, RETRY_LATER_MESSAGE),
          });
      });
    // 별로였던 곳과 가게에 들른 근거는 하트 선택 시트와 상세 안내에만 쓰므로, 못 받아도 다른 내 맛집 목록과 따로 둡니다.
    Promise.all([getDislikedPlaceIds(accessToken), getVisitProofPlaceIds(accessToken)])
      .then(([dislikedIds, proofIds]) => {
        if (!active) return;
        setDislikedPlaceIds(dislikedIds);
        setVisitProofPlaceIds(proofIds);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [accessToken, setMyPlaceState, notify]);

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
    const [records, likedIds, visitedLikedIds, dislikedIds, proofIds, recent, placeList] = await Promise.allSettled([
      getMyPlaceRecords(accessToken),
      getLikedPlaceIds(accessToken),
      getVisitedLikedPlaceIds(accessToken),
      getDislikedPlaceIds(accessToken),
      // 빠른 저장을 하면 이 이벤트로 다시 읽어, 그 가게에서 바로 '입맛에 맞았어요'를 고를 수 있게 합니다.
      getVisitProofPlaceIds(accessToken),
      getRecentPlaces(accessToken),
      getPlaces(accessToken, ""),
    ]);
    if (records.status === "fulfilled") setMyPlaceRecords(records.value);
    if (likedIds.status === "fulfilled") setLikedPlaceIds(likedIds.value);
    if (visitedLikedIds.status === "fulfilled") setVisitedLikedPlaceIds(visitedLikedIds.value);
    if (dislikedIds.status === "fulfilled") setDislikedPlaceIds(dislikedIds.value);
    if (proofIds.status === "fulfilled") setVisitProofPlaceIds(proofIds.value);
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
    visitedLikedPlaceIds,
    setVisitedLikedPlaceIds,
    dislikedPlaceIds,
    setDislikedPlaceIds,
    visitProofPlaceIds,
    setVisitProofPlaceIds,
    setMyPlaceState,
  };
}
