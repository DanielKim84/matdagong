import { useEffect, useState } from "react";
import type { Taster } from "../models/place";
import {
  createSubscription,
  getPlanCatalog,
  type PlanCatalog,
} from "../services/community";
import Icon from "../components/Icon";

type Props = {
  taster: Taster;
  accessToken: string;
  currentFreeName?: string;
  onClose: () => void;
  onComplete: (result: {
    replacedFreeNickname: string | null;
    isFree: boolean;
  }) => void;
};

const currency = new Intl.NumberFormat("ko-KR");

export default function SubscriptionOfferSheet({
  taster,
  accessToken,
  currentFreeName,
  onClose,
  onComplete,
}: Props) {
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
  const [type, setType] = useState<"FREE" | "PAID">("FREE");
  const [months, setMonths] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getPlanCatalog(accessToken)
      .then((plans) => {
        setCatalog(plans);
        setMonths(plans.paidPlans[0]?.termMonths ?? null);
      })
      .catch((cause: Error) => setError(cause.message))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const selectedPlan = catalog?.paidPlans.find(
    (plan) => plan.termMonths === months,
  );

  async function submit() {
    if (type === "PAID" && months === null) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await createSubscription(
        accessToken,
        taster.tasterId,
        type,
        type === "FREE" ? null : months,
      );
      onComplete({
        replacedFreeNickname: result.replacedFreeNickname,
        isFree: type === "FREE",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "구독을 완료하지 못했어요.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="subscription-backdrop" onMouseDown={onClose}>
      <section
        className="subscription-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscription-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="subscription-sheet-header">
          <div>
            <small>맛객 구독</small>
            <h2 id="subscription-title">{taster.tasterName} 구독하기</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="닫기">
            <Icon name="close" />
          </button>
        </header>

        <p className="subscription-intro">
          마음에 드는 맛객의 맛집 기록과 새로운 추천을 받아보세요.
        </p>

        {loading ? (
          <div className="subscription-loading">구독 상품을 불러오고 있어요…</div>
        ) : (
          <>
            <button
              className={`subscription-choice ${type === "FREE" ? "selected" : ""}`}
              onClick={() => setType("FREE")}
              type="button"
            >
              <span className="subscription-radio" />
              <span className="subscription-choice-copy">
                <b>무료 구독</b>
                <small>기간 제한 없이 구독해요. 무료 구독은 한 명만 가능해요.</small>
              </span>
              <strong>무료</strong>
            </button>

            {currentFreeName && type === "FREE" && currentFreeName !== taster.tasterName && (
              <p className="subscription-replace-note">
                무료 구독을 신청하면 현재 구독 중인 <b>{currentFreeName}</b> 구독이
                취소되고 이 맛객으로 바뀌어요.
              </p>
            )}

            <button
              className={`subscription-choice ${type === "PAID" ? "selected" : ""}`}
              onClick={() => setType("PAID")}
              type="button"
            >
              <span className="subscription-radio" />
              <span className="subscription-choice-copy">
                <b>유료 구독</b>
                <small>원하는 기간을 선택해 구독해요.</small>
              </span>
              <strong>기간 선택</strong>
            </button>

            {type === "PAID" && (
              <div className="subscription-terms" aria-label="구독 기간">
                {catalog?.paidPlans.map((plan) => (
                  <button
                    type="button"
                    key={plan.termMonths}
                    className={months === plan.termMonths ? "selected" : ""}
                    onClick={() => setMonths(plan.termMonths)}
                  >
                    <span>{plan.termMonths}개월</span>
                    <b>₩{currency.format(plan.priceAmount)}</b>
                  </button>
                ))}
              </div>
            )}

            <div className="subscription-summary">
              <span>{type === "FREE" ? "구독료" : `${months ?? "-"}개월 구독료`}</span>
              <b>
                {type === "FREE"
                  ? "무료"
                  : selectedPlan
                    ? `₩${currency.format(selectedPlan.priceAmount)}`
                    : "-"}
              </b>
            </div>
            <p className="subscription-renewal-note">
              유료 구독은 자동 결제되지 않으며, 기간이 끝난 뒤 다시 구독할 수 있어요.
            </p>
            {catalog?.testMode && (
              <p className="subscription-test-note">
                테스트 구독료예요. 결제하기를 눌러도 실제 결제는 발생하지 않습니다.
              </p>
            )}
          </>
        )}

        {error && <p className="subscription-error" role="alert">{error}</p>}
        <button
          className="primary-button subscription-submit"
          disabled={loading || submitting || (type === "PAID" && !selectedPlan)}
          onClick={() => void submit()}
        >
          {submitting
            ? "구독을 처리하고 있어요…"
            : type === "FREE"
              ? "무료 구독 신청"
              : selectedPlan
                ? `₩${currency.format(selectedPlan.priceAmount)} 결제하고 구독`
                : "기간을 선택해 주세요"}
        </button>
      </section>
    </div>
  );
}
