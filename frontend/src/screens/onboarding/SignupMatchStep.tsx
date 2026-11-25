import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import MascotArt from "../../components/MascotArt";
import SelectChip from "../../components/SelectChip";
import StepProgress from "../../components/StepProgress";
import TasterAvatar from "../../components/TasterAvatar";
import { EmptyState } from "../../components/ui";
import { createSubscription } from "../../services/community";
import { errorMessage } from "../../utils/errorMessage";
import { formatNumber } from "../../utils/format";
import { loadRecommendations, type LoadState, type Recommendation } from "./loadRecommendations";

/** 한 줄에 보여 줄 취향 태그 수 */
const ROW_TAG_LIMIT = 3;

type SortKey = "taste" | "subscribers";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "taste", label: "취향 높은순" },
  { value: "subscribers", label: "구독자 많은순" },
];

/**
 * 가입 3단계 · 맛객 추천(보드 04-04): "추천 맛객 N명"과 정렬 고르기, 맛객 줄(얼굴 · 이름과 취향 % · 가본 곳·구독자 수 · 회색 태그 ·
 * 오른쪽 체크 상자), 아래 "선택한 맛객 구독하기 (N명)" 체크와 "맛다공 시작하기"입니다.
 * 무료 구독은 한 번에 한 명이라(커뮤니티 모듈 SubscriptionService) 보드와 달리 한 명만 고릅니다(다른 맛객을 고르면 바뀜).
 * 취향을 골랐으면 취향 % 순, 아니면 많이 찾는 맛객으로 채웁니다(loadRecommendations). 구독 체크를 끄면 구독 없이 시작합니다.
 */
export default function SignupMatchStep({
  accessToken,
  onBack,
  onComplete,
}: {
  accessToken: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("taste");
  const [willSubscribe, setWillSubscribe] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    loadRecommendations(accessToken)
      .then((loaded) => {
        if (!active) return;
        setItems(loaded);
        setLoadState("ready");
      })
      .catch(() => {
        if (active) setLoadState("error");
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const selected = items.find((item) => item.taster.tasterId === selectedId)?.taster;
  const isByTaste = items.some((item) => item.reason === "taste");
  const sorted =
    sortKey === "subscribers"
      ? [...items].sort((left, right) => (right.taster.subscriberCount ?? 0) - (left.taster.subscriberCount ?? 0))
      : items;

  async function start() {
    if (!selected || !willSubscribe) {
      onComplete();
      return;
    }
    setIsSubmitting(true);
    setError("");
    try {
      await createSubscription(accessToken, selected.tasterId, "FREE", null);
      onComplete();
    } catch (cause) {
      setError(errorMessage(cause, "구독하지 못했어요. 잠시 후 다시 시도해 주세요."));
      setIsSubmitting(false);
    }
  }

  return (
    <main className="r-screen r-onboarding r-onboarding-signup r-signup-step r-signup-match">
      <StepProgress step={3} total={3} label="가입 진행" onBack={onBack} className="r-onboarding-progress" />
      <div className="r-onboarding-signup__content">
        <header className="r-onboarding-heading">
          <h1 className="r-display">{isByTaste ? "취향이 비슷한 맛객을 추천해요." : "많이 찾는 맛객을 추천해요."}</h1>
          <p className="r-muted">
            {isByTaste
              ? "내 취향과 잘 맞는 맛객을 골라 함께 해보세요."
              : "지금은 구독자와 기록이 많은 맛객을 골라 함께 해보세요."}
          </p>
        </header>
        {loadState === "loading" ? (
          <EmptyState tone="loading" title="추천 맛객을 찾고 있어요…">
            <MascotArt pose={7} className="r-onboarding-empty-art" />
          </EmptyState>
        ) : !items.length ? (
          <EmptyState
            tone={loadState === "error" ? "error" : "empty"}
            title={loadState === "error" ? "맛객 추천을 불러오지 못했어요" : "아직 추천할 맛객이 없어요"}
            message="맛객 탭에서 언제든 찾아볼 수 있어요."
          >
            <MascotArt pose={9} className="r-onboarding-empty-art" />
          </EmptyState>
        ) : (
          <section aria-labelledby="signup-match-title">
            <div className="r-signup-match__head">
              <h2 id="signup-match-title" className="r-onboarding-subhead">
                추천 맛객 {items.length}명
              </h2>
              <SelectChip label="정렬" value={sortKey} options={SORT_OPTIONS} onChange={setSortKey} />
            </div>
            <div className="r-signup-match__list" role="radiogroup" aria-label="구독할 맛객">
              {sorted.map(({ taster, recordCount, reason }) => {
                const isOn = taster.tasterId === selectedId;
                const tags = (taster.matchedTags?.length ? taster.matchedTags : (taster.profileTags ?? [])).slice(
                  0,
                  ROW_TAG_LIMIT,
                );
                return (
                  <button
                    key={taster.tasterId}
                    type="button"
                    role="radio"
                    aria-checked={isOn}
                    className={`r-signup-match__row ${isOn ? "is-on" : ""}`}
                    onClick={() => setSelectedId(isOn ? null : taster.tasterId)}
                  >
                    <TasterAvatar taster={taster} />
                    <span className="r-signup-match__body">
                      <span className="r-signup-match__name">
                        <b>{taster.tasterName}</b>
                        <em className={reason === "taste" ? "is-taste" : "is-popular"}>
                          {reason === "taste" ? `취향 ${taster.matchScore ?? 0}%` : "인기"}
                        </em>
                      </span>
                      <small>
                        가본 곳 {formatNumber(recordCount)}곳 · 구독자 {formatNumber(taster.subscriberCount ?? 0)}명
                      </small>
                      {tags.length > 0 && (
                        <span className="r-signup-match__tags">
                          {tags.map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </span>
                      )}
                    </span>
                    <span className="r-signup-match__check" aria-hidden="true">
                      <Icon name="check" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}
        {error && (
          <p className="r-error-text" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="r-onboarding-footer">
        {items.length > 0 && (
          <label className="r-signup-match__confirm">
            <input
              type="checkbox"
              checked={willSubscribe}
              disabled={isSubmitting}
              onChange={(event) => setWillSubscribe(event.target.checked)}
            />
            <span className="r-signup-match__box" aria-hidden="true">
              <Icon name="check" />
            </span>
            선택한 맛객 구독하기 ({selected ? 1 : 0}명)
          </label>
        )}
        <button
          type="button"
          className="r-button r-button--primary r-button--block"
          disabled={isSubmitting || loadState === "loading"}
          onClick={() => void start()}
        >
          {isSubmitting ? "구독하는 중…" : "맛다공 시작하기"}
        </button>
      </div>
    </main>
  );
}
