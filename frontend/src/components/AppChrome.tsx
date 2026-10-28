import { back, go } from "../app/navigation";
import type { Screen } from "../models/place";
import { BrandArt } from "./BrandAssets";
import Icon from "./Icon";

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
          aria-label="맛집 검색"
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

export function BottomTabs({ screen }: { screen: Screen }) {
  const tabs = [
    { screen: "home", label: "홈", icon: "home" },
    { screen: "map", label: "내 주변", icon: "search" },
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
          onClick={() => go(tab.screen)}
          aria-label={tab.label}
        >
          <span>
            <Icon
              name={tab.icon}
              filled={screen === tab.screen && tab.screen === "home"}
            />
          </span>
          {tab.screen !== "register" && <small>{tab.label}</small>}
        </button>
      ))}
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
