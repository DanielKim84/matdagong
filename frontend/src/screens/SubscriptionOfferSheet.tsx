import { useEffect, useState } from "react";
import { RETRY_LATER_MESSAGE, useAppData } from "../app/AppData";
import Icon from "../components/Icon";
import { useNotificationDialog } from "../components/NotificationDialog";
import Sheet from "../components/Sheet";
import TasterAvatar from "../components/TasterAvatar";
import { createSubscription, getPlanCatalog } from "../services/community";
import type { PlanCatalog } from "../models/community";
import { errorMessage } from "../utils/errorMessage";
import { formatNumber } from "../utils/format";

/** 맛객 구독 시트: 무료 1명 또는 유료 기간을 골라 구독합니다. 구독할 맛객은 useAppData().subscriptionTarget입니다. */
export default function SubscriptionOfferSheet() {
  const { accessToken, subscriptionTarget, currentFreeSubscription, tasters, actions } = useAppData();
  const { confirm } = useNotificationDialog();
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
  const [type, setType] = useState<"FREE" | "PAID">("FREE");
  const [months, setMonths] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPlanCatalog(accessToken)
      .then((plans) => {
        if (!active) return;
        setCatalog(plans);
        setMonths(plans.paidPlans[0]?.termMonths ?? null);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause, "구독 상품을 불러오지 못했어요."));
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  if (!subscriptionTarget) return null;
  const taster = subscriptionTarget;
  const currentFreeTasterId = currentFreeSubscription?.targetAccountId;
  const currentFreeTaster = tasters.find((item) => item.tasterId === currentFreeTasterId);
  const selectedPlan = catalog?.paidPlans.find((plan) => plan.termMonths === months);
  const isReplacingFree = !!currentFreeTasterId && currentFreeTasterId !== taster.tasterId;
  const freeName = currentFreeSubscription?.targetNickname ?? "기존 맛객";

  async function submit() {
    if (type === "PAID" && months === null) return;
    let isReplacementConfirmed = false;
    if (type === "FREE" && isReplacingFree) {
      const isAccepted = await confirm({
        title: "무료 구독 맛객을 바꿀까요?",
        message: `${freeName} 맛객의 무료 구독을 끝내고 ${taster.tasterName} 맛객을 무료로 구독해요.`,
        tone: "warning",
        confirmLabel: "무료 구독 바꾸기",
      });
      if (!isAccepted) return;
      isReplacementConfirmed = true;
    }
    if (type === "PAID") {
      const isAccepted = await confirm({
        title: "맛객 구독 확인",
        message: `${taster.tasterName} 맛객의 기록을 ${months}개월 동안 구독해요.\n현재는 별도 결제 없이 이용할 수 있어요.`,
        tone: "info",
        confirmLabel: "구독하기",
      });
      if (!isAccepted) return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      const result = await createSubscription(
        accessToken,
        taster.tasterId,
        type,
        type === "FREE" ? null : months,
        isReplacementConfirmed,
      );
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
        title: type === "FREE" ? "무료 구독을 시작했어요" : "구독이 시작됐어요",
        message:
          type === "FREE"
            ? result.replacedFreeNickname
              ? `${result.replacedFreeNickname} 무료 구독이 종료되고 ${taster.tasterName} 구독으로 바뀌었어요.`
              : `${taster.tasterName}의 맛집 소식을 받아볼 수 있어요.`
            : `${taster.tasterName} 맛객의 기록을 ${months}개월 동안 이용할 수 있어요.`,
      });
    } catch (cause) {
      setError(errorMessage(cause, "구독을 완료하지 못했어요."));
      setIsSubmitting(false);
    }
  }

  const submitLabel = isSubmitting
    ? "구독을 처리하고 있어요…"
    : type === "FREE"
      ? isReplacingFree
        ? "무료 구독 바꾸기"
        : "무료로 구독 시작"
      : selectedPlan
        ? `${months}개월 구독 시작`
        : "기간을 골라 주세요";

  return (
    <Sheet
      title={`${taster.tasterName} 구독하기`}
      onClose={actions.closeSubscription}
      backdropClassName="r-tasters-offer"
      className="r-tasters-offer__panel"
      header={
        <>
          <div className="r-tasters-offer__head">
            <TasterAvatar className="r-tasters-avatar r-tasters-avatar--md" taster={taster} />
            <span>
              <h2 className="r-display">{taster.tasterName} 구독하기</h2>
              <small>새 기록 알림 · 구독 피드에서 모아 보기</small>
            </span>
            <button type="button" className="r-icon-button" onClick={actions.closeSubscription} aria-label="닫기">
              <Icon name="close" />
            </button>
          </div>
        </>
      }
    >
      {isLoading ? (
        <p className="r-tasters-offer__status" role="status">
          구독 상품을 불러오고 있어요…
        </p>
      ) : (
        <div className="r-tasters-offer__options" role="radiogroup" aria-label="구독 방식">
          <button
            type="button"
            role="radio"
            aria-checked={type === "FREE"}
            className={`r-tasters-offer__option ${type === "FREE" ? "is-on" : ""}`}
            onClick={() => setType("FREE")}
          >
            <span className="r-tasters-offer__radio" aria-hidden="true" />
            <span className="r-tasters-offer__copy">
              <b>무료 구독</b>
              <small>
                {isReplacingFree
                  ? `지금은 ${freeName} 맛객을 무료로 구독 중이에요`
                  : "첫 1명은 무료로 구독할 수 있어요"}
              </small>
            </span>
            <strong>0원</strong>
          </button>

          {type === "FREE" && isReplacingFree && (
            <div className="r-tasters-offer__swap" aria-label="무료 구독 대상 변경 안내">
              <span>
                <TasterAvatar
                  className="r-tasters-avatar r-tasters-avatar--sm"
                  taster={{
                    tasterName: freeName,
                    avatar: currentFreeTaster?.avatar,
                    avatarVariant: currentFreeTaster?.avatarVariant ?? 1,
                  }}
                />
                <small>{freeName}</small>
              </span>
              <Icon name="chevron" />
              <span>
                <TasterAvatar className="r-tasters-avatar r-tasters-avatar--sm" taster={taster} />
                <small>{taster.tasterName}</small>
              </span>
              <p>무료 구독은 한 명만 가능해서, 신청하면 무료 구독 대상이 바뀌어요.</p>
            </div>
          )}

          <div className={`r-tasters-offer__option r-tasters-offer__option--paid ${type === "PAID" ? "is-on" : ""}`}>
            <button
              type="button"
              role="radio"
              aria-checked={type === "PAID"}
              className="r-tasters-offer__paid-head"
              onClick={() => setType("PAID")}
            >
              <span className="r-tasters-offer__radio" aria-hidden="true" />
              <span className="r-tasters-offer__copy">
                <b>유료 구독</b>
                <small>구독료 일부가 맛객에게 돌아가요</small>
              </span>
            </button>
            {catalog?.paidPlans.length ? (
              <div className="r-tasters-offer__plans" role="group" aria-label="구독 기간">
                {catalog.paidPlans.map((plan) => {
                  const isOn = type === "PAID" && months === plan.termMonths;
                  return (
                    <button
                      type="button"
                      key={plan.termMonths}
                      className={isOn ? "is-on" : ""}
                      aria-pressed={isOn}
                      onClick={() => {
                        setType("PAID");
                        setMonths(plan.termMonths);
                      }}
                    >
                      {plan.termMonths}개월
                      {catalog.testMode ? (
                        <small>
                          <del>₩{formatNumber(plan.priceAmount)}</del> 0원
                        </small>
                      ) : (
                        <small>₩{formatNumber(plan.priceAmount)}</small>
                      )}
                    </button>
                  );
                })}
              </div>
            ) : (
              <small className="r-tasters-offer__status">지금 고를 수 있는 유료 기간이 없어요.</small>
            )}
          </div>
          {catalog?.testMode && type === "PAID" && (
            <p className="r-tasters-offer__note">지금은 시범 운영 중이라 유료 구독도 결제 없이 시작돼요.</p>
          )}
        </div>
      )}

      {error && (
        <p className="r-error-text" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="r-button r-button--primary r-button--block"
        disabled={isLoading || isSubmitting || (type === "PAID" && !selectedPlan)}
        onClick={() => void submit()}
      >
        {submitLabel}
      </button>
    </Sheet>
  );
}
