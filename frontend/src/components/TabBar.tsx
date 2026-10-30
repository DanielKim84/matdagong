import { useState } from "react";
import { go } from "../app/navigation";
import type { Screen } from "../models/place";
import Icon from "./Icon";
import QuickPlaceSheet from "./QuickPlaceSheet";
import Sheet from "./Sheet";

/** 하단 탭의 화면 묶음입니다. 발견은 지도 첫 화면(home/map)입니다. */
export type TabKey = "discover" | "feed" | "tasters" | "me";

export function tabForScreen(screen: Screen): TabKey | null {
  if (screen === "home" || screen === "map") return "discover";
  if (screen === "feed") return "feed";
  if (screen === "tasters" || screen === "taster-recommendations") return "tasters";
  if (screen === "my") return "me";
  return null;
}

const tabs: { key: TabKey; label: string; screen: Screen }[] = [
  { key: "discover", label: "발견", screen: "home" },
  { key: "feed", label: "피드", screen: "feed" },
  { key: "tasters", label: "맛객", screen: "tasters" },
  { key: "me", label: "나", screen: "my" },
];

function TabIcon({ tab }: { tab: TabKey }) {
  // 탭 아이콘은 이 막대에서만 쓰므로 공통 Icon에 넣지 않고 여기서 그립니다.
  const paths: Record<TabKey, React.ReactNode> = {
    discover: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
    feed: <><rect x="4" y="4" width="16" height="11" rx="2" /><path d="M7 19h10" /></>,
    tasters: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6" /></>,
    me: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  };
  return <svg className="r-tabbar__icon" viewBox="0 0 24 24" aria-hidden="true">{paths[tab]}</svg>;
}

/** 화면 아래에 떠 있는 탭 막대와 가운데 기록 버튼입니다. */
export default function TabBar({ active, accessToken }: { active: TabKey; accessToken: string }) {
  const [recordMenuOpen, setRecordMenuOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const renderTab = (tab: typeof tabs[number]) => (
    <button
      key={tab.key}
      type="button"
      className={`r-tabbar__tab ${active === tab.key ? "is-active" : ""}`}
      aria-current={active === tab.key ? "page" : undefined}
      onClick={() => go(tab.screen)}
    >
      <TabIcon tab={tab.key} />
      <span>{tab.label}</span>
    </button>
  );
  return (
    <>
      <nav className="r-tabbar" aria-label="하단 메뉴">
        {tabs.slice(0, 2).map(renderTab)}
        <button type="button" className="r-tabbar__record" aria-label="기록하기" onClick={() => setRecordMenuOpen(true)}>
          <Icon name="plus" />
        </button>
        {tabs.slice(2).map(renderTab)}
      </nav>
      {recordMenuOpen && (
        <Sheet title="무엇을 남길까요?" onClose={() => setRecordMenuOpen(false)} className="r-record-menu">
          <div className="r-record-menu__list">
            <button type="button" className="r-card r-record-menu__item" onClick={() => { setRecordMenuOpen(false); go("register"); }}>
              <span className="r-record-menu__icon is-strong"><Icon name="fork" /></span>
              <span className="r-record-menu__copy"><b>맛집 기록하기</b><small>다녀온 곳의 추천 이유와 사진</small></span>
              <Icon name="chevron" />
            </button>
            <button type="button" className="r-card r-record-menu__item" onClick={() => { setRecordMenuOpen(false); setQuickOpen(true); }}>
              <span className="r-record-menu__icon"><Icon name="pin" /></span>
              <span className="r-record-menu__copy"><b>빠른 저장</b><small>장소만 먼저 남기고 나중에 완성</small></span>
              <Icon name="chevron" />
            </button>
          </div>
        </Sheet>
      )}
      {quickOpen && <QuickPlaceSheet accessToken={accessToken} onClose={() => setQuickOpen(false)} />}
    </>
  );
}
