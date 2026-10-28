import { useState } from "react";
import { go } from "../app/navigation";
import type { Screen } from "../models/place";
import { Avatar } from "../components/BrandAssets";
import Icon, { type IconName } from "../components/Icon";
import Sheet from "../components/Sheet";
import type { IncomingSubscription, PointAccount } from "../services/community";

type Props = {
  collectionCount: number;
  registeredCount: number;
  subscribedCount: number;
  recommendedTasterCount: number;
  recentCount: number;
  nickname: string;
  profileImgUrl: string | null;
  avatarVariant: number;
  incomingSubscriptions: IncomingSubscription[];
  points: PointAccount;
};
export default function MyScreen({
  collectionCount,
  registeredCount,
  subscribedCount,
  recommendedTasterCount,
  recentCount,
  nickname,
  profileImgUrl,
  avatarVariant,
  incomingSubscriptions,
  points,
}: Props) {
  const [pointsOpen, setPointsOpen] = useState(false);
  const [incomingOpen, setIncomingOpen] = useState(false);
  const activities: {
    label: string;
    icon: IconName;
    screen: Screen;
    count: number;
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
      label: "내 맛집",
      icon: "heart",
      screen: "saved",
      count: collectionCount,
    },
    {
      label: "최근 본 맛집",
      icon: "clock",
      screen: "recent",
      count: recentCount,
    },
  ];
  const paidCount = incomingSubscriptions.filter(({ subscriptionType }) => subscriptionType === "PAID").length;
  const freeCount = incomingSubscriptions.length - paidCount;
  return (
    <main className="my-screen">
      <section className="my-identity">
        <button
          className="my-avatar-upload"
          type="button"
          onClick={() => go("profile-edit")}
          aria-label="내 프로필 수정"
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
      <button className="my-incoming-summary" type="button" onClick={() => setIncomingOpen(true)}>
        <span className="my-incoming-icon"><Icon name="user" /></span>
        <span className="my-incoming-copy"><b>나를 구독하는 맛객</b><small>내 기록을 구독 중인 맛객과 수익 현황</small><em><span>유료 {paidCount}</span><i />무료 {freeCount}</em></span>
        <strong>{incomingSubscriptions.length}<small>명</small></strong><Icon name="chevron" />
      </button>
      <section className="points-summary">
        <span>
          <Icon name="fork" />
        </span>
        <div>
          <small>보유 포인트</small>
          <b>
            {points.balance.toLocaleString("ko-KR")} <em>P</em>
          </b>
        </div>
        <button onClick={() => setPointsOpen(true)}>포인트 내역</button>
      </section>
      <section className="my-activity-section">
        <div className="my-activity-heading"><h2>내 활동</h2><small>맛다공에서 모은 기록</small></div>
        <div className="my-activity-grid">
          {activities.map((activity) => <button onClick={() => go(activity.screen)} key={activity.label}>
            <span><Icon name={activity.icon} /></span><b>{activity.label}</b><strong>{activity.count}<small>{activity.screen === "subscriptions" ? "명" : "곳"}</small></strong>
            <Icon name="chevron" />
          </button>)}
        </div>
        <button className="my-recommendation-link" type="button" onClick={() => go("taster-recommendations")}>
          <span><Icon name="sparkle" /></span>
          <span><b>취향 맛객 추천</b><small>나와 잘 맞는 맛객을 둘러보세요</small></span>
          <strong>{recommendedTasterCount}<small>명</small></strong>
          <Icon name="chevron" />
        </button>
      </section>
      {incomingOpen && <Sheet title="나를 구독하는 맛객" onClose={() => setIncomingOpen(false)} className="incoming-subscribers-sheet">
        <p className="incoming-subscribers-intro">나를 구독 중인 맛객과 구독 유형이에요.</p>
        {incomingSubscriptions.length ? incomingSubscriptions.map((subscription) => <button className="incoming-subscriber-row" key={subscription.subscriptionId} onClick={() => { setIncomingOpen(false); go("profile", subscription.subscriberAccountId); }}>
          <Avatar src={subscription.avatar} name={subscription.subscriberNickname} variant={subscription.avatarVariant} />
          <span><b>{subscription.subscriberNickname}</b><small>{subscription.subscriptionType === "FREE" ? "무료 구독" : `유료 구독 · ${subscription.termMonths ?? 0}개월`}</small></span>
          <Icon name="chevron" />
        </button>) : <div className="points-empty incoming-empty"><span><Icon name="user" /></span><h2>아직 구독자가 없어요</h2><p>누군가 나를 구독하면 이곳에서 무료·유료 구독을 확인할 수 있어요.</p></div>}
      </Sheet>}
      {pointsOpen && (
        <Sheet title="포인트 내역" onClose={() => setPointsOpen(false)}>
          <div className="point-history-balance"><small>현재 보유 포인트</small><b>{points.balance.toLocaleString("ko-KR")} P</b></div>
          {points.history.length ? <div className="point-history-list">{points.history.map((entry) => <article key={entry.historyId}>
            <span><b>{entry.title}</b><small>{new Date(entry.createdAt).toLocaleDateString("ko-KR")}{entry.memo ? " · " + entry.memo : ""}</small></span>
            <strong className={entry.amount > 0 ? "earned" : "spent"}>{entry.amount > 0 ? "+" : ""}{entry.amount.toLocaleString("ko-KR")} P</strong>
          </article>)}</div> : <div className="points-empty"><span><Icon name="fork" /></span><h2>포인트 내역이 없어요</h2><p>적립하거나 사용한 포인트가 생기면 이곳에서 확인할 수 있어요.</p></div>}
        </Sheet>
      )}
    </main>
  );
}
