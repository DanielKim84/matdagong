import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import { useNotificationDialog } from "../../components/NotificationDialog";
import Sheet from "../../components/Sheet";
import { EmptyState } from "../../components/ui";
import type { ActiveSubscription } from "../../models/community";
import type { Taster } from "../../models/place";
import { formatMonthDay } from "../../utils/format";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import { confirmCancelSubscription, daysLeft, fallbackTaster, planLabel } from "./tasterData";

/** 내가 구독 중인 맛객 목록. 각 줄의 "관리"에서 프로필 보기·해지를 고릅니다. */
export default function SubscribedList() {
  const app = useAppData();
  const [managing, setManaging] = useState<ActiveSubscription | null>(null);

  if (!app.subscriptions.length) {
    return (
      <EmptyState
        icon="user"
        title="아직 구독한 맛객이 없어요"
        message="취향이 맞는 맛객을 구독하면 새 기록을 피드에서 모아 볼 수 있어요."
        action={{ label: "맛객 찾아보기", onClick: () => go("tasters"), variant: "primary" }}
      />
    );
  }

  const tasterOf = (subscription: ActiveSubscription) =>
    app.tasterById.get(subscription.targetAccountId) ??
    fallbackTaster(subscription.targetAccountId, subscription.targetNickname);

  return (
    <>
      <div className="r-card r-tasters-list">
        {app.subscriptions.map((subscription) => {
          const taster = tasterOf(subscription);
          const isFree = subscription.subscriptionType === "FREE";
          return (
            <div className="r-tasters-sub-row" key={subscription.subscriptionId}>
              <button type="button" className="r-row" onClick={() => go("profile", taster.tasterId)}>
                <Avatar
                  className="r-tasters-avatar r-tasters-avatar--md"
                  src={avatarSource(taster.tasterId, taster.avatar)}
                  fallbackSrc={avatarFallback(taster.tasterId, taster.avatar)}
                  name={taster.tasterName}
                  variant={taster.avatarVariant}
                />
                <span className="r-row__copy">
                  <b>{taster.tasterName}</b>
                  <small className={isFree ? "r-tasters-plan is-free" : "r-tasters-plan"}>
                    {planLabel(subscription)}
                  </small>
                </span>
              </button>
              <button
                type="button"
                className="r-tasters-sub-row__manage"
                onClick={() => setManaging(subscription)}
                aria-label={`${taster.tasterName} 구독 관리`}
              >
                관리
              </button>
            </div>
          );
        })}
      </div>

      {managing && (
        <ManageSheet subscription={managing} taster={tasterOf(managing)} onClose={() => setManaging(null)} />
      )}
    </>
  );
}

/** 구독 한 건의 관리 시트: 남은 기간, 프로필 보기, 기간 연장(준비 중), 해지 */
function ManageSheet({
  subscription,
  taster,
  onClose,
}: {
  subscription: ActiveSubscription;
  taster: Taster;
  onClose: () => void;
}) {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const [isCanceling, setIsCanceling] = useState(false);
  const left = daysLeft(subscription.endAt);
  const isPaid = subscription.subscriptionType === "PAID";

  async function cancel() {
    if (!(await confirmCancelSubscription(confirm, taster.tasterName, subscription))) return;
    setIsCanceling(true);
    try {
      await app.actions.cancelSubscriptionById(subscription.subscriptionId);
      onClose();
    } finally {
      setIsCanceling(false);
    }
  }

  return (
    <Sheet title="구독 관리" onClose={onClose} className="r-tasters-manage-sheet">
      <div className="r-tasters-manage-sheet__head">
        <Avatar
          className="r-tasters-avatar r-tasters-avatar--md"
          src={avatarSource(taster.tasterId, taster.avatar)}
          fallbackSrc={avatarFallback(taster.tasterId, taster.avatar)}
          name={taster.tasterName}
          variant={taster.avatarVariant}
        />
        <span>
          <b>{taster.tasterName}</b>
          <small>{planLabel(subscription)}</small>
        </span>
      </div>
      {isPaid && (
        <div className="r-tasters-manage-sheet__term">
          <span>남은 기간</span>
          <b>{left !== null ? `${left}일` : "확인할 수 없음"}</b>
          <small>
            {formatMonthDay(subscription.startAt)} 시작
            {subscription.endAt ? ` · ${formatMonthDay(subscription.endAt)} 종료` : ""}
          </small>
        </div>
      )}
      <div className="r-tasters-manage-sheet__actions">
        <button
          type="button"
          className="r-button r-button--secondary r-button--block"
          onClick={() => go("profile", taster.tasterId)}
        >
          프로필 보기
        </button>
        {isPaid && (
          <button
            type="button"
            className="r-button r-button--secondary r-button--block"
            onClick={() =>
              app.actions.notify({
                kind: "info",
                title: "기간 연장은 준비 중이에요",
                message: "지금은 구독이 끝난 뒤 다시 구독할 수 있어요.",
              })
            }
          >
            기간 연장
          </button>
        )}
        <button
          type="button"
          className="r-button r-button--soft r-button--block"
          disabled={isCanceling}
          onClick={() => void cancel()}
        >
          {isCanceling ? "해지하고 있어요…" : "구독 해지"}
        </button>
      </div>
    </Sheet>
  );
}
