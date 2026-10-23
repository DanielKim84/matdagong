import { useState } from "react";
import type { NewPlace } from "../models/place";

type Activity = {
  saved: string[];
  subscriptions: string[];
  registered: NewPlace[];
  liked: string[];
  recent: string[];
  readAlerts: boolean;
};
const initial: Activity = {
  saved: [],
  subscriptions: ["u-01", "u-03"],
  registered: [],
  liked: [],
  recent: [],
  readAlerts: false,
};
// 서버 연동 전 사용자 동작을 같은 브라우저에만 보존하는 개발용 저장소 키입니다.
const storageKey = "matdagong-activity-v2";

function read(): Activity {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    return value ? { ...initial, ...value } : initial;
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
  function toggle(field: "saved" | "subscriptions" | "liked", id: string) {
    save({
      ...activity,
      [field]: activity[field].includes(id)
        ? activity[field].filter((item) => item !== id)
        : [...activity[field], id],
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
    toggle,
    register,
    remember,
    readAlertsNow: () => save({ ...activity, readAlerts: true }),
  };
}
