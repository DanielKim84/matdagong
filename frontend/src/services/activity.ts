/**
 * 이전 버전 호환용: 장소 등록·하트·최근 본 장소를 서버에 저장하기 전 버전은 이 브라우저(localStorage)에만 남겼습니다.
 * 지금은 App이 이 값을 계정 DB로 한 번 옮기는 데만 읽으며, 새 기록을 여기에 쓰지 않습니다.
 */
import { useState } from "react";
import type { NewPlace, RecommendedMenu } from "../models/place";
import { STORAGE_KEYS, readStorage, removeStorage } from "../utils/storage";

type Activity = {
  registered: NewPlace[];
  liked: string[];
  recent: string[];
  recentAt: Record<string, number>;
};
const INITIAL_ACTIVITY: Activity = {
  registered: [],
  liked: [],
  recent: [],
  recentAt: {},
};
// 앞의 키가 최신 형식입니다. 이전이 끝나면 App이 모두 지웁니다.
const LEGACY_ACTIVITY_STORAGE_KEYS = STORAGE_KEYS.legacyActivity;
const RECENT_RETENTION_MS = 15 * 24 * 60 * 60 * 1000;
const MAX_RECENT_ITEMS = 30;

function pruneRecent(activity: Activity, now = Date.now()): Activity {
  const recent = activity.recent
    .filter((id) => {
      const viewedAt = activity.recentAt[id];
      return typeof viewedAt === "number" && now - viewedAt < RECENT_RETENTION_MS;
    })
    .slice(0, MAX_RECENT_ITEMS);
  if (recent.length === activity.recent.length) return activity;
  return { ...activity, recent, recentAt: Object.fromEntries(recent.map((id) => [id, activity.recentAt[id]])) };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function field(value: object, key: string): unknown {
  return key in value ? Reflect.get(value, key) : undefined;
}

/** 저장된 등록 기록입니다. 이전 버전이 직접 쓴 값이라 객체인 항목만 장소로 받습니다. */
function registeredPlaces(value: unknown): NewPlace[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((place): place is NewPlace => !!place && typeof place === "object")
    .map((place) => ({
      ...place,
      // 메뉴 가격 입력이 추가되기 전 저장한 문자열 메뉴도 이름만 유지해 읽습니다.
      menus: (Array.isArray(place.menus) ? place.menus : []).map(
        (menu: RecommendedMenu | string): RecommendedMenu => (typeof menu === "string" ? { name: menu } : menu),
      ),
    }));
}

function read(): Activity {
  const raw = LEGACY_ACTIVITY_STORAGE_KEYS.map((key) => readStorage(key, "local")).find(Boolean);
  if (!raw) return INITIAL_ACTIVITY;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return INITIAL_ACTIVITY;
  }
  if (!value || typeof value !== "object") return INITIAL_ACTIVITY;
  const recent = [...new Set(stringList(field(value, "recent")))];
  const now = Date.now();
  const storedRecentAt = field(value, "recentAt");
  const recentAt =
    storedRecentAt && typeof storedRecentAt === "object"
      ? Object.fromEntries(
          Object.entries(storedRecentAt).filter((entry): entry is [string, number] => typeof entry[1] === "number"),
        )
      : Object.fromEntries(recent.map((id) => [id, now]));
  return pruneRecent(
    {
      registered: registeredPlaces(field(value, "registered")),
      recent,
      recentAt,
      // 예전 스크랩과 좋아요를 한 가지 하트 동작으로 합쳐 기존 사용자 목록을 보존합니다.
      liked: [...new Set([...stringList(field(value, "liked")), ...stringList(field(value, "saved"))])],
    },
    now,
  );
}

/** 화면을 여는 동안 이전 브라우저 기록을 한 번 읽어 둡니다. */
export function useActivity() {
  const [activity] = useState(read);
  return activity;
}

/** 서버로 옮기기를 마친 뒤 이전 버전 저장소를 모두 지웁니다. */
export function clearLegacyActivity(): void {
  LEGACY_ACTIVITY_STORAGE_KEYS.forEach((key) => removeStorage(key, "local"));
}
