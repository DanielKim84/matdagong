import { useState } from "react";
import { RETRY_LATER_MESSAGE, useAppData } from "../app/AppData";
import { ProfileCover } from "../components/BrandAssets";
import Icon from "../components/Icon";
import { useNotificationDialog } from "../components/NotificationDialog";
import SubScreen from "../components/SubScreen";
import { createSubscription } from "../services/community";
import { errorMessage } from "../utils/errorMessage";
import { coverOf } from "./tasters/tasterData";

/**
 * 구독 선택(보드 16-03, 전체 화면): 맛객 배경 사진 위 "좋아하는 맛객을 구독하고 더 가까이 만나세요.", 무료 구독 · 유료 구독(준비 중) 설명 줄,
 * 아래 "무료로 구독하기"와 막아 둔 "유료 구독 (준비 중)"입니다. 구독할 맛객은 useAppData().subscriptionTarget입니다.
 * 무료 구독은 한 명만이라 이미 다른 맛객을 무료로 구독 중이면 바꿀지 먼저 묻습니다. 유료 구독은 결제를 붙일 때까지 막아 둡니다.
 */
export default function SubscriptionOfferSheet() {
  const { accessToken, subscriptionTarget, currentFreeSubscription, actions } = useAppData();
  const { confirm } = useNotificationDialog();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!subscriptionTarget) return null;
  const taster = subscriptionTarget;
  const currentFreeTasterId = currentFreeSubscription?.targetAccountId;
  const isReplacingFree = !!currentFreeTasterId && currentFreeTasterId !== taster.tasterId;
  const freeName = currentFreeSubscription?.targetNickname ?? "기존 맛객";

  async function subscribeFree() {
    let isReplacementConfirmed = false;
    if (isReplacingFree) {
      const isAccepted = await confirm({
        title: "무료 구독 맛객을 바꿀까요?",
        message: `${freeName} 맛객의 무료 구독을 끝내고 ${taster.tasterName} 맛객을 무료로 구독해요.`,
        tone: "warning",
        confirmLabel: "무료 구독 바꾸기",
      });
      if (!isAccepted) return;
      isReplacementConfirmed = true;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const result = await createSubscription(accessToken, taster.tasterId, "FREE", null, isReplacementConfirmed);
      actions.closeSubscription();
      void actions.refreshCommunity().catch((cause: unknown) =>
        actions.notify({
          kind: "error",
          title: "구독 정보를 새로고침하지 못했어요",
          message: errorMessage(cause, RETRY_LATER_MESSAGE),
        }),
      );
      actions.notify({
        kind: "success",
        title: "무료 구독을 시작했어요",
        message: result.replacedFreeNickname
          ? `${result.replacedFreeNickname} 무료 구독이 종료되고 ${taster.tasterName} 구독으로 바뀌었어요.`
          : `${taster.tasterName}의 맛집 소식을 받아볼 수 있어요.`,
      });
    } catch (cause) {
      setError(errorMessage(cause, "구독을 완료하지 못했어요."));
      setIsSubmitting(false);
    }
  }

  return (
    <SubScreen
      title="구독 선택"
      onClose={actions.closeSubscription}
      className="r-tasters-offer"
      footer={
        <div className="r-tasters-offer__buttons">
          <button
            type="button"
            className="r-button r-button--primary r-button--block"
            disabled={isSubmitting}
            onClick={() => void subscribeFree()}
          >
            {isSubmitting ? "구독을 처리하고 있어요…" : isReplacingFree ? "무료 구독 바꾸기" : "무료로 구독하기"}
          </button>
          <button type="button" className="r-button r-button--block r-tasters-offer__paid" disabled>
            유료 구독 (준비 중)
          </button>
        </div>
      }
    >
      <div className="r-tasters-offer__cover">
        <ProfileCover src={coverOf(taster)} />
        <p className="r-display">
          좋아하는
          <br />
          {taster.tasterName} 맛객을 구독하고
          <br />더 가까이 만나세요.
        </p>
      </div>

      <ul className="r-tasters-offer__plans">
        <li>
          <span className="r-tasters-offer__icon">
            <Icon name="heart" />
          </span>
          <span>
            <b>무료 구독</b>
            <small>
              {isReplacingFree
                ? `지금은 ${freeName} 맛객을 무료로 구독 중이에요. 무료 구독은 한 명만이라 바꾸게 돼요.`
                : "맛객의 공개된 콘텐츠를 계속 받아볼 수 있어요."}
            </small>
          </span>
        </li>
        <li>
          <span className="r-tasters-offer__icon">
            <Icon name="crown" />
          </span>
          <span>
            <b>유료 구독 (준비 중)</b>
            <small>
              더 풍부한 구독 혜택을 준비하고 있어요.
              <br />
              지금은 무료 구독으로 이용해 보세요!
            </small>
          </span>
        </li>
      </ul>

      {error && (
        <p className="r-error-text" role="alert">
          {error}
        </p>
      )}
    </SubScreen>
  );
}
