import { useState } from "react";
import { go } from "../app/navigation";
import type { Screen } from "../models/place";
import { Avatar } from "../components/BrandAssets";
import Icon, { type IconName } from "../components/Icon";
import Sheet from "../components/Sheet";

type Props = {
  savedCount: number;
  likedCount: number;
  registeredCount: number;
  subscribedCount: number;
  recentCount: number;
  nickname: string;
  profileImgUrl: string | null;
  avatarVariant: number;
};
export default function MyScreen({
  savedCount,
  likedCount,
  registeredCount,
  subscribedCount,
  recentCount,
  nickname,
  profileImgUrl,
  avatarVariant,
}: Props) {
  const [pointsOpen, setPointsOpen] = useState(false);
  const menus: {
    label: string;
    icon: IconName;
    screen: Screen;
    count?: number;
  }[] = [
    {
      label: "내 구독 맛객",
      icon: "pin",
      screen: "subscriptions",
      count: subscribedCount,
    },
    {
      label: "내가 등록한 맛집",
      icon: "fork",
      screen: "diary",
      count: registeredCount,
    },
    {
      label: "최근 본 맛집",
      icon: "clock",
      screen: "recent",
      count: recentCount,
    },
    { label: "설정", icon: "settings", screen: "settings" },
  ];
  return (
    <main className="my-screen">
      <section className="my-identity">
        <button
          className="my-avatar-upload"
          type="button"
          onClick={() => go("profile-edit")}
          aria-label="프로필 사진 변경"
        >
          <Avatar src={profileImgUrl} name={nickname} variant={avatarVariant} />
          <span><Icon name="camera" /></span>
        </button>
        <div>
          <h1>{nickname}</h1>
          <small>@{nickname.replaceAll(" ", "")}_matguest</small>
        </div>
        <button
          className="icon-button"
          onClick={() => go("settings")}
          aria-label="설정"
        >
          <Icon name="settings" />
        </button>
      </section>
      <section className="points-summary">
        <span>
          <Icon name="fork" />
        </span>
        <div>
          <small>보유 포인트</small>
          <b>
            0 <em>P</em>
          </b>
        </div>
        <button onClick={() => setPointsOpen(true)}>포인트 내역</button>
      </section>
      <div className="my-statistics">
        <button onClick={() => go("diary")}>
          <b>{registeredCount}</b>
          <span>내 맛집</span>
        </button>
        <button onClick={() => go("liked")}>
          <b>{likedCount}</b>
          <span>좋아요</span>
        </button>
        <button onClick={() => go("saved")}>
          <b>{savedCount}</b>
          <span>스크랩</span>
        </button>
      </div>
      <div className="my-menu-list">
        {menus.map((menu) => (
          <button onClick={() => go(menu.screen)} key={menu.label}>
            <span className="red-menu-icon">
              <Icon name={menu.icon} />
            </span>
            <b>{menu.label}</b>
            {menu.count !== undefined && <small>{menu.count}</small>}
            <Icon name="chevron" />
          </button>
        ))}
      </div>
      {pointsOpen && (
        <Sheet title="포인트 내역" onClose={() => setPointsOpen(false)}>
          <div className="points-empty">
            <span>
              <Icon name="fork" />
            </span>
            <h2>보유 포인트 0 P</h2>
            <p>
              아직 포인트 내역이 없어요.
              <br />
              포인트 적립과 사용은 서비스 준비 중입니다.
            </p>
          </div>
        </Sheet>
      )}
    </main>
  );
}
