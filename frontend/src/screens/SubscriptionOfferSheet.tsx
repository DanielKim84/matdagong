import { useEffect, useState } from "react";
import type { Taster } from "../models/place";
import {
  createSubscription,
  getPlanCatalog,
  type PlanCatalog,
} from "../services/community";
import Icon from "../components/Icon";
import { Avatar } from "../components/BrandAssets";
import { useNotificationDialog } from "../components/NotificationDialog";

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
  const [catalog, setCatalog] = useState<PlanCatalog | null>(null);
  const [type, setType] = useState<"FREE" | "PAID">("FREE");
  const [months, setMonths] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmFreeReplacement, setConfirmFreeReplacement] = useState(false);

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

  async function submit(confirmedReplacement = false) {
    if (type === "PAID" && months === null) return;
    if (type === "FREE" && currentFreeTasterId && currentFreeTasterId !== taster.tasterId && !confirmedReplacement) {
      setConfirmFreeReplacement(true);
      return;
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
              onClick={() => { setType("FREE"); setConfirmFreeReplacement(false); }}
              type="button"
            >
              <span className="subscription-radio" />
              <span className="subscription-choice-copy">
                <b>무료 구독</b>
                <small>기간 제한 없이 구독해요. 무료 구독은 한 명만 가능해요.</small>
              </span>
              <strong>무료</strong>
            </button>

            {currentFreeTasterId && currentFreeTasterId !== taster.tasterId && type === "FREE" && (
              <section className="subscription-replace-card" aria-label="무료 구독 대상 변경 안내">
                <b className="subscription-replace-title">무료 구독 대상이 바뀌어요</b>
                <div className="subscription-replace-flow">
                  <div className="subscription-replace-person">
                    <Avatar src={currentFreeTaster?.avatar} name={currentFreeName ?? "기존 맛객"} variant={currentFreeTaster?.avatarVariant} />
                    <span><small>현재 구독 중</small><strong>{currentFreeName ?? "기존 맛객"}</strong></span>
                  </div>
                  <span className="subscription-replace-arrow" aria-hidden="true">→</span>
                  <div className="subscription-replace-person">
                    <Avatar src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
                    <span><small>새로 구독</small><strong>{taster.tasterName}</strong></span>
                  </div>
                </div>
                <p>신청하면 무료 구독 대상이 {taster.tasterName} 맛객으로 바뀌어요.</p>
              </section>
            )}

            <button
              className={`subscription-choice ${type === "PAID" ? "selected" : ""}`}
              onClick={() => {
                setType("PAID");
                setConfirmFreeReplacement(false);
              }}
              type="button"
            >
              <span className="subscription-radio" />
              <span className="subscription-choice-copy">
                <b>유료 구독</b>
                <small>원하는 기간을 골라 구독할 수 있어요.</small>
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
                    <span className="subscription-plan-price"><del>₩{currency.format(plan.priceAmount)}</del><b>0원</b></span>
                  </button>
                ))}
              </div>
            )}

            <div className="subscription-summary">
              <span>{type === "FREE" ? "구독료" : `${months ?? "-"}개월 구독료`}</span>
              {type === "FREE" ? <b>무료</b> : selectedPlan ? (
                <span className="subscription-summary-price"><del>₩{currency.format(selectedPlan.priceAmount)}</del><b>0원</b></span>
              ) : <b>-</b>}
            </div>
          </>
        )}

        {confirmFreeReplacement && (
          <div className="subscription-replacement-confirm" role="alertdialog" aria-labelledby="free-replacement-title">
            <b id="free-replacement-title">무료 구독 맛객을 바꿀까요?</b>
            <p><strong>{currentFreeName ?? "현재 구독 중인"}</strong> 맛객의 무료 구독을 취소하고 <strong>{taster.tasterName}</strong> 맛객을 무료 구독합니다.</p>
            <div>
              <button type="button" onClick={() => setConfirmFreeReplacement(false)}>취소</button>
              <button type="button" disabled={submitting} onClick={() => void submit(true)}>{submitting ? "변경 중…" : "무료 구독 바꾸기"}</button>
            </div>
          </div>
        )}
        {error && <p className="subscription-error" role="alert">{error}</p>}
        <button
          className="primary-button subscription-submit"
          disabled={loading || submitting || confirmFreeReplacement || (type === "PAID" && !selectedPlan)}
          onClick={() => void submit()}
        >
          {submitting
            ? "구독을 처리하고 있어요…"
            : type === "FREE"
              ? "무료 구독 신청"
              : selectedPlan
                ? `${months}개월 무료 구독 신청`
                : "기간을 선택해 주세요"}
        </button>
      </section>
    </div>
  );
}
