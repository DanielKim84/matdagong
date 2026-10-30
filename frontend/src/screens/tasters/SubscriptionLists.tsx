import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import Sheet from "../../components/Sheet";
import { relativeTime } from "../../components/ui";
import type { ActiveSubscription } from "../../services/community";
import { daysLeft, fallbackTaster, formatDate, planLabel } from "./tasterData";

/** 내가 구독 중인 맛객 목록. 각 줄의 "관리"에서 프로필 보기·해지를 고릅니다. */
export function SubscribedList() {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const [managing, setManaging] = useState<ActiveSubscription | null>(null);
  const [canceling, setCanceling] = useState(false);

  if (!app.subscriptions.length) {
    return (
      <div className="r-empty">
        <span className="r-badge-icon"><Icon name="user" /></span>
        <b>아직 구독한 맛객이 없어요</b>
        <p>취향이 맞는 맛객을 구독하면 새 기록을 피드에서 모아 볼 수 있어요.</p>
        <button type="button" className="r-button r-button--primary r-button--pill" onClick={() => go("tasters")}>맛객 찾아보기</button>
      </div>
    );
  }

  const tasterOf = (subscription: ActiveSubscription) =>
    app.tasterById.get(subscription.targetAccountId)
    ?? fallbackTaster(subscription.targetAccountId, subscription.targetNickname);

  async function cancel(subscription: ActiveSubscription) {
    const name = tasterOf(subscription).tasterName;
    const paidEnd = subscription.subscriptionType === "PAID" && subscription.endAt ? formatDate(subscription.endAt) : null;
    const accepted = await confirm({
      title: paidEnd ? "유료 구독을 해지할까요?" : "구독을 해지할까요?",
      message: paidEnd
        ? "지금 해지하면 남은 기간과 관계없이 구독이 바로 끝나요."
        : `${name} 맛객의 새 기록 알림과 구독 피드 표시가 멈춰요.`,
      ...(paidEnd ? { detail: { label: "원래 종료 예정일", value: paidEnd } } : {}),
      tone: "danger",
      confirmLabel: "구독 해지",
    });
    if (!accepted) return;
    setCanceling(true);
    try {
      await app.actions.cancelSubscriptionById(subscription.subscriptionId);
      setManaging(null);
    } finally {
      setCanceling(false);
    }
  }

  const managingTaster = managing ? tasterOf(managing) : null;
  const left = managing ? daysLeft(managing.endAt) : null;

  return (
    <>
      <div className="r-card r-tasters-list">
        {app.subscriptions.map((subscription) => {
          const taster = tasterOf(subscription);
          const free = subscription.subscriptionType === "FREE";
          return (
            <div className="r-tasters-sub-row" key={subscription.subscriptionId}>
              <button type="button" className="r-row" onClick={() => go("profile", taster.tasterId)}>
                <Avatar className="r-tasters-avatar r-tasters-avatar--md" src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
                <span className="r-row__copy">
                  <b>{taster.tasterName}</b>
                  <small className={free ? "r-tasters-plan is-free" : "r-tasters-plan"}>{planLabel(subscription)}</small>
                </span>
              </button>
              <button
                type="button"
                className="r-tasters-manage"
                onClick={() => setManaging(subscription)}
                aria-label={`${taster.tasterName} 구독 관리`}
              >
                관리
              </button>
            </div>
          );
        })}
      </div>

      {managing && managingTaster && (
        <Sheet title="구독 관리" onClose={() => setManaging(null)} className="r-tasters-manage-sheet">
          <div className="r-tasters-manage-head">
            <Avatar className="r-tasters-avatar r-tasters-avatar--md" src={managingTaster.avatar} name={managingTaster.tasterName} variant={managingTaster.avatarVariant} />
            <span>
              <b>{managingTaster.tasterName}</b>
              <small>{planLabel(managing)}</small>
            </span>
          </div>
          {managing.subscriptionType === "PAID" && (
            <div className="r-tasters-manage-term">
              <span>남은 기간</span>
              <b>{left !== null ? `${left}일` : "확인할 수 없음"}</b>
              <small>{formatDate(managing.startAt)} 시작{managing.endAt ? ` · ${formatDate(managing.endAt)} 종료` : ""}</small>
            </div>
          )}
          <div className="r-tasters-manage-actions">
            <button type="button" className="r-button r-button--secondary r-button--block" onClick={() => go("profile", managingTaster.tasterId)}>
              프로필 보기
            </button>
            {managing.subscriptionType === "PAID" && (
              <button
                type="button"
                className="r-button r-button--secondary r-button--block"
                onClick={() => app.actions.notify({ kind: "info", title: "기간 연장은 준비 중이에요", message: "지금은 구독이 끝난 뒤 다시 구독할 수 있어요." })}
              >
                기간 연장
              </button>
            )}
            <button type="button" className="r-button r-button--soft r-button--block" disabled={canceling} onClick={() => void cancel(managing)}>
              {canceling ? "해지하고 있어요…" : "구독 해지"}
            </button>
          </div>
        </Sheet>
      )}
    </>
  );
}

/** 나를 구독한 사람 목록. 맛객 프로필이 있는 사람만 눌러서 프로필로 갑니다. */
export function IncomingList() {
  const app = useAppData();
  if (!app.incomingSubscriptions.length) {
    return (
      <div className="r-empty">
        <span className="r-badge-icon"><Icon name="heart" /></span>
        <b>아직 나를 구독한 사람이 없어요</b>
        <p>공개 기록을 꾸준히 남기면 취향이 맞는 사람이 찾아와요.</p>
        <button type="button" className="r-button r-button--primary r-button--pill" onClick={() => go("register")}>기록 남기기</button>
      </div>
    );
  }
  return (
    <div className="r-card r-tasters-list">
      {app.incomingSubscriptions.map((subscription) => {
        const known = app.tasterById.get(subscription.subscriberAccountId);
        const content = (
          <>
            <Avatar
              className="r-tasters-avatar r-tasters-avatar--md"
              src={subscription.avatar ?? known?.avatar}
              name={subscription.subscriberNickname}
              variant={subscription.avatarVariant}
            />
            <span className="r-row__copy">
              <b>{subscription.subscriberNickname}</b>
              <small>{planLabel(subscription)}</small>
            </span>
            {subscription.startAt && <small className="r-tasters-since">{relativeTime(subscription.startAt)} 구독</small>}
          </>
        );
        return known ? (
          <button type="button" className="r-row" key={subscription.subscriptionId} onClick={() => go("profile", known.tasterId)}>
            {content}
          </button>
        ) : (
          <div className="r-row" key={subscription.subscriptionId}>{content}</div>
        );
      })}
    </div>
  );
}
