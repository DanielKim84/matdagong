/**
 * 이전 버전 호환용: 장소 등록·하트·최근 본 장소를 서버에 저장하기 전 버전은 이 브라우저(localStorage)에만 남겼습니다.
 * 지금은 App이 이 값을 계정 DB로 한 번 옮기는 데만 읽으며, 새 기록을 여기에 쓰지 않습니다.
 */
import { useState } from "react";
import type { NewPlace } from "../models/place";

type Activity = {
  registered: NewPlace[];
  liked: string[];
  recent: string[];
  recentAt: Record<string, number>;
};
const initial: Activity = {
  registered: [],
  liked: [],
  recent: [],
  recentAt: {},
};
// 앞의 키가 최신 형식입니다. 이전이 끝나면 App이 모두 지웁니다.
export const LEGACY_ACTIVITY_STORAGE_KEYS = ["matdagong-activity-v4", "matdagong-activity-v3", "matdagong-activity-v2"] as const;
const RECENT_RETENTION_MS = 15 * 24 * 60 * 60 * 1000;
const MAX_RECENT_ITEMS = 30;

function pruneRecent(activity: Activity, now = Date.now()): Activity {
  const recent = activity.recent.filter((id) => {
    const viewedAt = activity.recentAt[id];
    return typeof viewedAt === "number" && now - viewedAt < RECENT_RETENTION_MS;
  }).slice(0, MAX_RECENT_ITEMS);
  if (recent.length === activity.recent.length) return activity;
  return { ...activity, recent, recentAt: Object.fromEntries(recent.map((id) => [id, activity.recentAt[id]])) };
}

function read(): Activity {
  try {
    const value = JSON.parse(LEGACY_ACTIVITY_STORAGE_KEYS.map((key) => localStorage.getItem(key)).find(Boolean) ?? "null");
    if (!value) return initial;
    // 예전 스크랩과 좋아요를 한 가지 하트 동작으로 합쳐 기존 사용자 목록을 보존합니다.
    const registered = (value.registered ?? []).map((place: NewPlace) => ({
      ...place,
      // 메뉴 가격 입력이 추가되기 전 저장한 문자열 메뉴도 이름만 유지해 읽습니다.
      menus: (place.menus ?? []).map((menu) => typeof menu === "string" ? { name: menu } : menu),
    }));
    const recent: string[] = [...new Set<string>((value.recent ?? []).filter((item: unknown): item is string => typeof item === "string"))];
    const now = Date.now();
    const recentAt = value.recentAt ?? Object.fromEntries(recent.map((id: string) => [id, now]));
    return pruneRecent({ ...initial, ...value, registered, recent, recentAt,
      liked: [...new Set([...(value.liked ?? []), ...(value.saved ?? [])])] }, now);
  } catch {
    return initial;
  }
}

/** 화면을 여는 동안 이전 브라우저 기록을 한 번 읽어 둡니다. */
export function useActivity() {
  const [activity] = useState(read);
  return activity;
}
