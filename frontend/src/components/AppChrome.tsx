import { useState } from "react";
import { back, go } from "../app/navigation";
import type { Screen } from "../models/place";
import { BrandArt } from "./BrandAssets";
import Icon from "./Icon";
import QuickPlaceSheet from "./QuickPlaceSheet";

export function HomeHeader({ unread }: { unread: boolean }) {
  return (
    <header className="home-header">
      <button
        className="logo-button"
        onClick={() => go("home")}
        aria-label="맛다공 홈"
      >
        <BrandArt name="logo" label="맛다공" />
      </button>
      <div>
        <button
          className="icon-button"
          onClick={() => go("map")}
          aria-label="맛집 찾기"
        >
          <Icon name="search" />
        </button>
        <button
          className="icon-button bell-button"
          onClick={() => go("notifications")}
          aria-label="알림"
        >
          <Icon name="bell" />
          {unread && <i />}
        </button>
      </div>
    </header>
  );
}

export function ScreenHeader({
  title,
  right,
  fallback = "home",
}: {
  title: string;
  right?: React.ReactNode;
  fallback?: Screen;
}) {
  return (
    <header className="screen-header">
      <button
        className="icon-button"
        onClick={() => back(fallback)}
        aria-label="이전 화면으로 돌아가기"
      >
        <Icon name="back" />
      </button>
      <h1>{title}</h1>
      <div>{right}</div>
    </header>
  );
}

export function BottomTabs({ screen, accessToken, unread = false }: { screen: Screen; accessToken: string; unread?: boolean }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const tabs = [
    { screen: "home", label: "홈", icon: "home" },
    { screen: "map", label: "내 주변", icon: "pin" },
    { screen: "register", label: "맛집 등록", icon: "plus" },
    { screen: "notifications", label: "알림", icon: "bell" },
    { screen: "my", label: "마이", icon: "user" },
  ] as const;
  return (
    <nav className="bottom-tabs" aria-label="하단 메뉴">
      {tabs.map((tab) => (
        <button
          key={tab.screen}
          aria-current={screen === tab.screen ? "page" : undefined}
          className={`${screen === tab.screen ? "active" : ""} ${tab.screen === "register" ? "register-tab" : ""}`}
          onClick={() => {
            if (tab.screen === "register") setActionsOpen((open) => !open);
            else { setActionsOpen(false); go(tab.screen); }
          }}
          aria-label={tab.label}
        >
          <span>
            <Icon
              name={tab.icon}
              filled={screen === tab.screen && tab.screen === "home"}
            />
            {tab.screen === "notifications" && unread && <i className="bottom-notification-dot" aria-label="읽지 않은 알림" />}
          </span>
          {tab.screen !== "register" && <small>{tab.label}</small>}
        </button>
      ))}
      {actionsOpen && <div className="quick-action-menu" role="menu" aria-label="기록 메뉴">
        <button type="button" role="menuitem" onClick={() => { setActionsOpen(false); go("register"); }}><span><Icon name="fork" /></span><b>맛집 등록</b><small>추천 이유와 사진까지 남겨요</small></button>
        <button type="button" role="menuitem" onClick={() => { setActionsOpen(false); setQuickOpen(true); }}><span><Icon name="pin" /></span><b>빠른 기록</b><small>장소만 저장하고 나중에 완성해요</small></button>
      </div>}
      {quickOpen && <QuickPlaceSheet accessToken={accessToken} onClose={() => setQuickOpen(false)} />}
    </nav>
  );
}

export function FeedTabs({
  value,
  onChange,
  tabs = ["추천", "구독", "광고 맛집"],
}: {
  value: string;
  onChange: (value: string) => void;
  tabs?: string[];
}) {
  return (
    <div className="feed-tabs" role="tablist" aria-label="맛집 종류">
      {tabs.map((tab) => (
        <button
          key={tab}
          role="tab"
          aria-selected={value === tab}
          className={value === tab ? "selected" : ""}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
