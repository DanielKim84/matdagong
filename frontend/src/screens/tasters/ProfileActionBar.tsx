import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import type { Taster } from "../../models/place";
import { confirmCancelSubscription } from "./tasterData";

/** 맛객 프로필 아래 고정 버튼 줄: 내 프로필은 편집, 다른 맛객은 후원(준비 중)과 구독·해지 */
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
      <div className="r-action-bar">
        <button type="button" className="r-button r-button--primary r-button--block" onClick={() => go("profile-edit")}>
          <Icon name="settings" /> 프로필 편집
        </button>
      </div>
    );
  }
  return (
    <div className="r-action-bar">
      <button
        type="button"
        className="r-button r-button--secondary r-tasters-support"
        onClick={() =>
          app.actions.notify({
            kind: "info",
            title: "후원은 준비 중이에요",
            message: "곧 마음에 드는 맛객을 응원할 수 있어요.",
          })
        }
      >
        후원
      </button>
      {isSubscribed ? (
        <button
          type="button"
          className="r-button r-button--secondary r-tasters-subscribed"
          disabled={isBusy}
          onClick={() => void unsubscribe()}
          aria-label={`${taster.tasterName} 구독 중, 눌러서 구독 해지`}
        >
          <Icon name="check" /> {isBusy ? "해지하고 있어요…" : "구독 중"}
        </button>
      ) : (
        <button
          type="button"
          className="r-button r-button--primary r-tasters-subscribe"
          onClick={() => app.actions.openSubscription(taster.tasterId)}
        >
          {app.currentFreeSubscription ? "구독하기" : "구독하기 · 첫 구독 무료"}
        </button>
      )}
    </div>
  );
}
