import { useEffect, useState } from "react";
import type { Screen } from "../models/place";

const screens: Screen[] = [
  "home",
  "map",
  "register",
  "my",
  "place",
  "profile",
  "notifications",
  "diary",
  "saved",
  "subscriptions",
  "taster-recommendations",
  "settings",
  "profile-edit",
  "intro",
  "liked",
  "recent",
  "feed",
  "tasters",
  "wallet",
];

function currentRoute(): { screen: Screen; id: string } {
  const [screen, id = ""] = window.location.hash.replace("#", "").split("/");
  return {
    screen: screens.includes(screen as Screen) ? (screen as Screen) : "home",
    id: decodeURIComponent(id),
  };
}

function routeKey(screen: Screen, id = ""): string {
  return `${screen}${id ? `/${encodeURIComponent(id)}` : ""}`;
}

// 해시 경로도 화면 이동 기록에 함께 저장해 앱 내부 뒤로가기를 복원합니다.
let routeHistory = [window.location.hash.replace(/^#/, "") || "home"];
let routeHistoryIndex = 0;

/** 로그인 콜백에서 이전 화면 경로를 복원한 뒤 앱 내부 이동 기록을 현재 주소 기준으로 다시 시작합니다. */
export function resetRouteHistory() {
  routeHistory = [window.location.hash.replace(/^#/, "") || "home"];
  routeHistoryIndex = 0;
}

function syncRouteHistory() {
  const current = window.location.hash.replace(/^#/, "") || "home";
  if (routeHistory[routeHistoryIndex] === current) return;

  const previousIndex = routeHistory.lastIndexOf(current, routeHistoryIndex - 1);
  if (previousIndex >= 0) {
    routeHistoryIndex = previousIndex;
    return;
  }

  const nextIndex = routeHistory.indexOf(current, routeHistoryIndex + 1);
  if (nextIndex >= 0) {
    routeHistoryIndex = nextIndex;
    return;
  }

  routeHistory = [...routeHistory.slice(0, routeHistoryIndex + 1), current];
  routeHistoryIndex += 1;
}

export function go(screen: Screen, id = "", replace = false) {
  const next = routeKey(screen, id);
  const current = window.location.hash.replace(/^#/, "") || "home";
  if (next === current) return;

  if (replace) {
    window.history.replaceState(window.history.state, "", `#${next}`);
    routeHistory[routeHistoryIndex] = next;
    window.dispatchEvent(new Event("hashchange"));
    return;
  }

  routeHistory = [...routeHistory.slice(0, routeHistoryIndex + 1), next];
  routeHistoryIndex += 1;
  window.location.hash = next;
}

/** 화면 이동 경로를 따라가되 반복된 현재 화면은 건너뛰고 상위 화면으로 돌아갑니다. */
export function back(fallback: Screen = "home") {
  syncRouteHistory();
  let targetIndex = routeHistoryIndex - 1;
  while (targetIndex >= 0 && routeHistory[targetIndex] === routeHistory[routeHistoryIndex]) {
    targetIndex -= 1;
  }
  if (targetIndex >= 0) {
    window.history.go(targetIndex - routeHistoryIndex);
    return;
  }
  go(fallback, "", true);
}

export function useRoute() {
  const [route, setRoute] = useState(currentRoute);
  useEffect(() => {
    function update() {
      syncRouteHistory();
      setRoute(currentRoute());
      window.scrollTo(0, 0);
    }
    window.addEventListener("hashchange", update);
    window.addEventListener("popstate", update);
    return () => {
      window.removeEventListener("hashchange", update);
      window.removeEventListener("popstate", update);
    };
  }, []);
  return route;
}
