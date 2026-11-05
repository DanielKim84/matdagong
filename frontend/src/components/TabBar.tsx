import type { ReactNode } from "react";
import { go } from "../app/navigation";
import type { Screen } from "../models/place";

/** 하단 탭의 화면 묶음입니다. 발견은 지도 첫 화면(home/map), 내 지도는 나와 관련된 맛집 지도입니다. */
type TabKey = "discover" | "feed" | "mymap" | "tasters" | "me";

/** 하단 탭을 보여 줄 화면이면 그 탭, 아니면 null입니다. */
export function tabForScreen(screen: Screen): TabKey | null {
  if (screen === "home" || screen === "map") return "discover";
  if (screen === "feed") return "feed";
  if (screen === "mymap") return "mymap";
  if (screen === "tasters" || screen === "taster-recommendations") return "tasters";
  if (screen === "my") return "me";
  return null;
}

const TABS: { key: TabKey; label: string; screen: Screen }[] = [
  { key: "discover", label: "발견", screen: "home" },
  { key: "feed", label: "피드", screen: "feed" },
  { key: "mymap", label: "내 지도", screen: "mymap" },
  { key: "tasters", label: "맛객", screen: "tasters" },
  { key: "me", label: "나", screen: "my" },
];

// 탭 아이콘은 이 막대에서만 쓰므로 공통 Icon에 넣지 않고 여기서 그립니다.
const TAB_ICON_PATHS: Record<TabKey, ReactNode> = {
  discover: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5-5 2 2-5z" />
    </>
  ),
  feed: (
    <>
      <rect x="4" y="4" width="16" height="11" rx="2" />
      <path d="M7 19h10" />
    </>
  ),
  mymap: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <path d="M15 10.1c0 2-3 4-3 4s-3-2-3-4a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8Z" />
    </>
  ),
  tasters: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

function TabIcon({ tab }: { tab: TabKey }) {
  return (
    <svg className="r-tabbar__icon" viewBox="0 0 24 24" aria-hidden="true">
      {TAB_ICON_PATHS[tab]}
    </svg>
  );
}

/** 화면 아래에 떠 있는 탭 막대입니다. 가운데 내 지도 탭은 동그란 버튼으로 크게 둡니다. */
export default function TabBar({ active }: { active: TabKey }) {
  return (
    <nav className="r-tabbar" aria-label="하단 메뉴">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`r-tabbar__tab ${tab.key === "mymap" ? "r-tabbar__center" : ""} ${active === tab.key ? "is-active" : ""}`}
          aria-current={active === tab.key ? "page" : undefined}
          onClick={() => go(tab.screen)}
        >
          {tab.key === "mymap" ? (
            <span className="r-tabbar__center-circle">
              <TabIcon tab={tab.key} />
            </span>
          ) : (
            <TabIcon tab={tab.key} />
          )}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
