import { useEffect, useRef, useState } from "react";
import type { Taster } from "../models/place";
import {
  createSubscription,
  getPlanCatalog,
  type PlanCatalog,
} from "../services/community";
import Icon from "../components/Icon";
import { Avatar } from "../components/BrandAssets";
import { useNotificationDialog, useNotificationPageLock } from "../components/NotificationDialog";

type Props = {
  taster: Taster;
  accessToken: string;
  currentFreeTasterId?: string;
  currentFreeName?: string;
  currentFreeTaster?: Taster;
  onClose: () => void;
  onComplete: (result: {
    replacedFreeNickname: string | null;
    isFree: boolean;
    termMonths: number | null;
  }) => void;
};

const currency = new Intl.NumberFormat("ko-KR");

/** 맛객 구독 시트: 무료 1명 또는 유료 기간을 골라 구독합니다. */
export default function SubscriptionOfferSheet({
  taster,
  accessToken,
  currentFreeTasterId,
  currentFreeName,
  currentFreeTaster,
  onClose,
  onComplete,
}: Props) {
  const { confirm } = useNotificationDialog();
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
  const [type, setType] = useState<"FREE" | "PAID">("FREE");
  const [months, setMonths] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useNotificationPageLock(true);

  useEffect(() => {
    getPlanCatalog(accessToken)
      .then((plans) => {
        setCatalog(plans);
        setMonths(plans.paidPlans[0]?.termMonths ?? null);
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus({ preventScroll: true });
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      previous?.focus({ preventScroll: true });
    };
  }, []);

  const selectedPlan = catalog?.paidPlans.find((plan) => plan.termMonths === months);
  const replacingFree = !!currentFreeTasterId && currentFreeTasterId !== taster.tasterId;
  const freeName = currentFreeName ?? "기존 맛객";

  async function submit() {
    if (type === "PAID" && months === null) return;
    let confirmedReplacement = false;
    if (type === "FREE" && replacingFree) {
      const accepted = await confirm({
        title: "무료 구독 맛객을 바꿀까요?",
        message: `${freeName} 맛객의 무료 구독을 끝내고 ${taster.tasterName} 맛객을 무료로 구독해요.`,
        tone: "warning",
        confirmLabel: "무료 구독 바꾸기",
      });
      if (!accepted) return;
      confirmedReplacement = true;
    }
    if (type === "PAID") {
      const accepted = await confirm({
        title: "맛객 구독 확인",
        message: `${taster.tasterName} 맛객의 기록을 ${months}개월 동안 구독해요.\n현재는 별도 결제 없이 이용할 수 있어요.`,
        tone: "info",
        confirmLabel: "구독하기",
      });
      if (!accepted) return;
    }
    setSubmitting(true);
    setError("");
    try {
      const result = await createSubscription(
        accessToken,
        taster.tasterId,
        type,
        type === "FREE" ? null : months,
        confirmedReplacement,
      );
      onComplete({
        replacedFreeNickname: result.replacedFreeNickname,
        isFree: type === "FREE",
        termMonths: type === "FREE" ? null : months,
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "구독을 완료하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel = submitting
    ? "구독을 처리하고 있어요…"
    : type === "FREE"
      ? replacingFree ? "무료 구독 바꾸기" : "무료로 구독 시작"
      : selectedPlan ? `${months}개월 구독 시작` : "기간을 골라 주세요";

  return (
    <div className="r-tasters-offer" onMouseDown={onClose}>
      <section
        ref={panel}
        tabIndex={-1}
        className="sheet r-tasters-offer__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="r-tasters-offer-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <span className="r-tasters-offer__handle" aria-hidden="true" />
        <div className="r-tasters-offer__head">
          <Avatar className="r-tasters-avatar r-tasters-avatar--md" src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
          <span>
            <h2 id="r-tasters-offer-title" className="r-display">{taster.tasterName} 구독하기</h2>
            <small>새 기록 알림 · 구독 피드에서 모아 보기</small>
          </span>
          <button type="button" className="r-icon-button" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </div>

        {loading ? (
          <p className="r-tasters-offer__status" role="status">구독 상품을 불러오고 있어요…</p>
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
                <small>{replacingFree ? `지금은 ${freeName} 맛객을 무료로 구독 중이에요` : "첫 1명은 무료로 구독할 수 있어요"}</small>
              </span>
              <strong>0원</strong>
            </button>

            {type === "FREE" && replacingFree && (
              <div className="r-tasters-offer__swap" aria-label="무료 구독 대상 변경 안내">
                <span>
                  <Avatar className="r-tasters-avatar r-tasters-avatar--sm" src={currentFreeTaster?.avatar} name={freeName} variant={currentFreeTaster?.avatarVariant} />
                  <small>{freeName}</small>
                </span>
                <Icon name="chevron" />
                <span>
                  <Avatar className="r-tasters-avatar r-tasters-avatar--sm" src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
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
                    const on = type === "PAID" && months === plan.termMonths;
                    return (
                      <button
                        type="button"
                        key={plan.termMonths}
                        className={on ? "is-on" : ""}
                        aria-pressed={on}
                        onClick={() => {
                          setType("PAID");
                          setMonths(plan.termMonths);
                        }}
                      >
                        {plan.termMonths}개월
                        {catalog.testMode ? (
                          <small><del>₩{currency.format(plan.priceAmount)}</del> 0원</small>
                        ) : (
                          <small>₩{currency.format(plan.priceAmount)}</small>
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

        {error && <p className="r-tasters-offer__error" role="alert">{error}</p>}
        <button
          type="button"
          className="r-button r-button--primary r-button--block"
          disabled={loading || submitting || (type === "PAID" && !selectedPlan)}
          onClick={() => void submit()}
        >
          {submitLabel}
        </button>
      </section>
    </div>
  );
}
