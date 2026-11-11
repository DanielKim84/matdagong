import HashTag from "../../components/HashTag";
import Icon from "../../components/Icon";
import type { Taster } from "../../models/place";
import { isTrustedTaster, TRUST_LEVEL_LABELS } from "../../models/trust";

/** 신뢰 등급마다 퍼센트 아래에 붙이는 한 줄 설명입니다. */
const TRUST_HINTS = {
  LEARNING: "같은 맛집을 다녀온 경험이 10곳 이상 쌓이면 믿고 가는 맛객인지 알 수 있어요.",
  NORMAL: "같은 맛집을 다녀온 경험과 고른 태그, 취향으로 계산했어요.",
  TRUSTED: "이 맛객이 기록한 곳이라면 믿고 가도 좋아요.",
  DIFFERENT: "같은 맛집에서 입맛이 엇갈린 적이 많았어요.",
} as const;

function percentBar(value: number, label: string, className = "") {
  return (
    <div
      className={`r-tasters-match__bar ${className}`}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-label={label}
    >
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/**
 * 맛객 프로필의 '나와의 비교' 카드. 같은 맛집 경험이 있으면 신뢰 %와 등급을 먼저, 그 아래에 취향 %와 겹친 태그를 보여 줍니다.
 */
export default function TasteMatchCard({ taster }: { taster: Taster }) {
  const matched = taster.matchedTags ?? [];
  const level = taster.trustLevel;
  const levelLabel = level ? TRUST_LEVEL_LABELS[level] : undefined;
  return (
    <section className="r-card r-tasters-match" aria-label="나와 신뢰·취향 비교">
      {taster.trustScore != null && (
        <div className={`r-tasters-match__trust ${isTrustedTaster(taster) ? "is-trusted" : ""}`}>
          <div className="r-tasters-match__top">
            <b>나와 신뢰</b>
            {levelLabel && (
              <span className={`r-tasters-match__level r-tasters-match__level--${level?.toLowerCase()}`}>
                {isTrustedTaster(taster) && <Icon name="star" filled />}
                {levelLabel}
              </span>
            )}
            <strong>{taster.trustScore}%</strong>
          </div>
          {percentBar(taster.trustScore, "경험 신뢰", "r-tasters-match__bar--trust")}
          {level && <small className="r-muted">{TRUST_HINTS[level]}</small>}
        </div>
      )}
      {taster.matchScore != null && (
        <>
          <div className="r-tasters-match__top">
            <b>나와 취향</b>
            <strong>{taster.matchScore}%</strong>
          </div>
          {percentBar(taster.matchScore, "취향 일치율")}
          {matched.length ? (
            <ul className="r-tags" aria-label="나와 겹치는 취향">
              {matched.map((tag) => (
                <HashTag key={tag} as="li" tag={tag} size="sm" isMatched />
              ))}
            </ul>
          ) : (
            <small className="r-muted">아직 겹치는 취향 태그가 없어요.</small>
          )}
        </>
      )}
    </section>
  );
}
