import { useState } from "react";
import type { NewPlace } from "../models/place";

type Activity = {
  registered: NewPlace[];
  liked: string[];
  recent: string[];
  readAlerts: boolean;
};
const initial: Activity = {
  registered: [],
  liked: [],
  recent: [],
  readAlerts: false,
};
// 서버 연동 전 사용자 동작을 같은 브라우저에만 보존하는 개발용 저장소 키입니다.
const storageKey = "matdagong-activity-v4";
const previousStorageKeys = ["matdagong-activity-v3", "matdagong-activity-v2"];

function read(): Activity {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? previousStorageKeys.map((key) => localStorage.getItem(key)).find(Boolean) ?? "null");
    if (!value) return initial;
    // 예전 스크랩과 좋아요를 한 가지 하트 동작으로 합쳐 기존 사용자 목록을 보존합니다.
    const registered = (value.registered ?? []).map((place: NewPlace) => ({
      ...place,
      // 메뉴 가격 입력이 추가되기 전 저장한 문자열 메뉴도 이름만 유지해 읽습니다.
      menus: (place.menus ?? []).map((menu) => typeof menu === "string" ? { name: menu } : menu),
    }));
    return { ...initial, ...value, registered, liked: [...new Set([...(value.liked ?? []), ...(value.saved ?? [])])] };
  } catch {
    return initial;
  }
}

export function useActivity() {
  const [activity, setActivity] = useState<Activity>(read);
  const [storageError, setStorageError] = useState("");
  function save(next: Activity) {
    setActivity(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
      setStorageError("");
    } catch {
      setStorageError(
        "기기 저장 공간이 부족해 새로고침 후 내용이 사라질 수 있어요.",
      );
    }
  }
  function toggleLiked(id: string) {
    save({
      ...activity,
      liked: activity.liked.includes(id)
        ? activity.liked.filter((item) => item !== id)
        : [...activity.liked, id],
    });
  }
  function register(place: NewPlace) {
    save({
      ...activity,
      registered: [place, ...activity.registered],
      readAlerts: false,
    });
  }
  function remember(id: string) {
    save({
      ...activity,
      recent: [id, ...activity.recent.filter((item) => item !== id)].slice(
        0,
        30,
      ),
    });
  }
  return {
    ...activity,
    storageError,
    toggleLiked,
    register,
    remember,
    readAlertsNow: () => save({ ...activity, readAlerts: true }),
  };
}
