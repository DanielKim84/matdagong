import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import type { Taster } from "../../models/place";
import { confirmCancelSubscription } from "./tasterData";

/** 맛객 프로필 소개 아래의 큰 버튼(보드 08-03): 내 프로필은 편집, 다른 맛객은 구독하기 또는 구독 중(누르면 해지 확인) */
export default function ProfileActionBar({ taster, isOwn }: { taster: Taster; isOwn: boolean }) {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const [isBusy, setIsBusy] = useState(false);
  const subscription = app.subscriptions.find((item) => item.targetAccountId === taster.tasterId);
  const isSubscribed = !!subscription || app.subscriptionIds.includes(taster.tasterId);

  async function unsubscribe() {
    if (!(await confirmCancelSubscription(confirm, taster.tasterName, subscription))) return;
    setIsBusy(true);
    try {
      await app.actions.cancelTasterSubscription(taster.tasterId);
    } finally {
      setIsBusy(false);
    }
  }

  if (isOwn) {
    return (
      <button
        type="button"
        className="r-button r-button--secondary r-button--block r-tasters-subscribe"
        onClick={() => go("profile-edit")}
      >
        <Icon name="pencil" /> 프로필 편집
      </button>
    );
  }
  return isSubscribed ? (
    <button
      type="button"
      className="r-button r-button--secondary r-button--block r-tasters-subscribe is-subscribed"
      disabled={isBusy}
      onClick={() => void unsubscribe()}
      aria-label={`${taster.tasterName} 구독 중, 눌러서 구독 해지`}
    >
      <Icon name="check" /> {isBusy ? "해지하고 있어요…" : "구독 중"}
    </button>
  ) : (
    <button
      type="button"
      className="r-button r-button--primary r-button--block r-tasters-subscribe"
      onClick={() => app.actions.openSubscription(taster.tasterId)}
    >
      <Icon name="user-plus" />
      {app.currentFreeSubscription ? "구독하기" : "구독하기 · 첫 구독 무료"}
    </button>
  );
}
