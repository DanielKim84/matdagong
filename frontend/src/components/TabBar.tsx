import type { ReactNode } from "react";
import { go } from "../app/navigation";
import type { Screen } from "../models/place";

/** 하단 탭의 화면 묶음입니다. 발견은 지도와 하단 목록 패널, 내 지도는 나와 관련된 맛집 지도입니다. */
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

// 탭 아이콘은 이 막대에서만 쓰므로 공통 Icon에 넣지 않고 여기서 그립니다(docs/ui/proposals 보드의 집·문서·접힌 지도·두 사람·사람).
// 고른 탭은 같은 모양을 코랄로 채워 그립니다(.r-tabbar__tab.is-active .r-tabbar__icon). 가운데 내 지도는 솟은 동그라미로 더 강조합니다(ui.css). 채운 안쪽에 흰 선으로 남길 선은 r-tabbar__line, 채우지 않는 열린 선은 r-tabbar__open입니다.
const TAB_ICON_PATHS: Record<TabKey, ReactNode> = {
  discover: (
    <>
      <path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 19z" />
      <path className="r-tabbar__line" d="M9.5 20.5v-5h5v5" />
    </>
  ),
  feed: (
    <>
      <rect x="4.5" y="4" width="15" height="16.5" rx="2.5" />
      <path className="r-tabbar__line" d="M8.5 9.5h7M8.5 13.5h7" />
    </>
  ),
  mymap: (
    <>
      <path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z" />
      <path className="r-tabbar__line" d="M9 4.5v13M15 6.5v13" />
    </>
  ),
  // 맛객: 앞사람(채움) 뒤로 다른 한 사람(열린 선)이 비켜 선 모양입니다. 셋을 겹쳐 그리면 작은 화면에서 "산 위의 동그라미"로 보여 두 사람으로 줄였습니다.
  tasters: (
    <>
      <circle cx="9" cy="7.5" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0z" />
      <path className="r-tabbar__open" d="M15 4.3a3.5 3.5 0 0 1 0 6.4M17.8 13.4a6.5 6.5 0 0 1 3.7 6.6" />
    </>
  ),
  me: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20.5a8 8 0 0 1 16 0z" />
    </>
  ),
};

/** 화면 아래의 고정 탭 막대입니다. 다섯 목적지를 같은 크기로 보여 줍니다. */
export default function TabBar({ active }: { active: TabKey }) {
  return (
    <nav className="r-tabbar" aria-label="하단 메뉴">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`r-tabbar__tab r-tabbar__tab--${tab.key} ${active === tab.key ? "is-active" : ""}`}
          aria-current={active === tab.key ? "page" : undefined}
          onClick={() => go(tab.screen)}
        >
          <svg className="r-tabbar__icon" viewBox="0 0 24 24" aria-hidden="true">
            {TAB_ICON_PATHS[tab.key]}
          </svg>
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
