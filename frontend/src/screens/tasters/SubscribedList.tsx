import { useState } from "react";
import type { SubscriptionFilter } from "./SubscriptionsManageScreen";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { useNotificationDialog } from "../../components/NotificationDialog";
import Sheet from "../../components/Sheet";
import { EmptyState } from "../../components/ui";
import TasterAvatar from "../../components/TasterAvatar";
import type { ActiveSubscription } from "../../models/community";
import type { Taster } from "../../models/place";
import Icon from "../../components/Icon";
import { formatMonthDay } from "../../utils/format";
import { confirmCancelSubscription, daysLeft, planLabel, subscribedTaster } from "./tasterData";

/**
 * 내가 구독 중인 맛객 목록(보드 16-01): 큰 얼굴 · 이름 · "유료 구독/무료 구독"과 초록 "활성" 알약 · 유료면 "만료: 날짜" · >.
 * filter로 무료·유료만 골라 보고, 줄을 누르면 관리 시트(프로필 보기 · 기간 연장 · 해지)를 엽니다.
 */
export default function SubscribedList({ filter = "all" }: { filter?: SubscriptionFilter }) {
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

  return (
    <>
      <div className="r-tasters-list">
        {app.subscriptions
          .filter((subscription) => filter === "all" || subscription.subscriptionType === filter)
          .map((subscription) => {
            const taster = subscribedTaster(app.tasterById, subscription);
            const isFree = subscription.subscriptionType === "FREE";
            return (
              <button
                type="button"
                className="r-row r-tasters-sub-row"
                key={subscription.subscriptionId}
                onClick={() => setManaging(subscription)}
                aria-label={`${taster.tasterName} 구독 관리`}
              >
                <TasterAvatar taster={taster} className="r-tasters-avatar r-tasters-avatar--lg" />
                <span className="r-row__copy">
                  <b>{taster.tasterName}</b>
                  <span className="r-tasters-sub-row__pills">
                    <em className={isFree ? "is-free" : "is-paid"}>{isFree ? "무료 구독" : "유료 구독"}</em>
                    <em className="is-active">활성</em>
                  </span>
                  {!isFree && subscription.endAt && <small>만료: {formatDate(subscription.endAt)}</small>}
                </span>
                <Icon name="chevron" />
              </button>
            );
          })}
      </div>

      {managing && (
        <ManageSheet
          subscription={managing}
          taster={subscribedTaster(app.tasterById, managing)}
          onClose={() => setManaging(null)}
        />
      )}
    </>
  );
}

/** "2025.03.31"처럼 점으로 나눈 날짜입니다(보드 16-01 만료일). */
function formatDate(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
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
  const remainingDays = daysLeft(subscription.endAt);
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
        <TasterAvatar taster={taster} className="r-tasters-avatar r-tasters-avatar--md" />
        <span>
          <b>{taster.tasterName}</b>
          <small>{planLabel(subscription)}</small>
        </span>
      </div>
      {isPaid && (
        <div className="r-tasters-manage-sheet__term">
          <span>남은 기간</span>
          <b>{remainingDays !== null ? `${remainingDays}일` : "확인할 수 없음"}</b>
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
