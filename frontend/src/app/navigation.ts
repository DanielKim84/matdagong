/** 해시 주소(#화면/ID) 화면 이동입니다. 앱 안의 이동 기록을 따로 들고 있어 뒤로 버튼이 앱 밖으로 나가지 않게 합니다. */
import { useEffect, useState } from "react";
import type { Screen } from "../models/place";

const SCREENS: Screen[] = [
  "home",
  "map",
  "mymap",
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
  "recent",
  "feed",
  "tasters",
  "wallet",
  "drafts",
  "disliked",
  "policy",
];

/** 지금 주소의 해시 경로(앞의 # 뺀 값)입니다. 비어 있으면 첫 화면(home)으로 봅니다. */
function currentHashPath(): string {
  return window.location.hash.replace(/^#/, "") || "home";
}

function currentRoute(): { screen: Screen; id: string } {
  const [screen, id = ""] = currentHashPath().split("/");
  return {
    screen: SCREENS.find((item) => item === screen) ?? "home",
    id: decodeURIComponent(id),
  };
}

function routeKey(screen: Screen, id = ""): string {
  return `${screen}${id ? `/${encodeURIComponent(id)}` : ""}`;
}

// 해시 경로도 화면 이동 기록에 함께 저장해 앱 내부 뒤로가기를 복원합니다.
let routeHistory = [currentHashPath()];
let routeHistoryIndex = 0;

/** 로그인 콜백에서 이전 화면 경로를 복원한 뒤 앱 내부 이동 기록을 현재 주소 기준으로 다시 시작합니다. */
export function resetRouteHistory() {
  routeHistory = [currentHashPath()];
  routeHistoryIndex = 0;
}

function syncRouteHistory() {
  const current = currentHashPath();
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

/** 해시 화면으로 이동합니다. 같은 주소면 무시하고, shouldReplace면 기록을 늘리지 않고 바꾼 뒤 hashchange를 직접 알립니다. */
export function go(screen: Screen, id = "", shouldReplace = false) {
  const next = routeKey(screen, id);
  if (next === currentHashPath()) return;

  if (shouldReplace) {
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

/** 지금 주소의 화면·ID입니다. 해시가 바뀌거나 뒤로 가면 앱 이동 기록을 맞추고 맨 위로 스크롤합니다. */
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
