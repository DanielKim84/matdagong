import { useEffect, useState } from "react";
import Icon from "../../components/Icon";
import MascotArt from "../../components/MascotArt";
import { EmptyState } from "../../components/ui";
import { useSwipe } from "../../hooks/useSwipe";
import { createSubscription } from "../../services/community";
import type { Taster } from "../../models/place";
import { errorMessage } from "../../utils/errorMessage";
import { loadMatches, type LoadState, type Match } from "./loadMatches";
import TasterMatchCard from "./TasterMatchCard";

/** 가입 3단계: 입맛이 맞는 맛객 카드를 넘겨 보고 한 명을 무료로 구독하거나 건너뜁니다. */
export default function SignupMatchStep({
  accessToken,
  displayName,
  onComplete,
}: {
  accessToken: string;
  displayName: string;
  onComplete: () => void;
}) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchState, setMatchState] = useState<LoadState>("loading");
  const [cursor, setCursor] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setMatchState("loading");
    setCursor(0);
    loadMatches(accessToken)
      .then((items) => {
        if (!active) return;
        setMatches(items);
        setMatchState("ready");
      })
      .catch(() => {
        if (active) setMatchState("error");
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  const nextMatch = () => setCursor((current) => current + 1);
  const swipe = useSwipe({ onLeft: nextMatch });

  async function subscribe(taster: Taster) {
    setIsSubmitting(true);
    setError("");
    try {
      await createSubscription(accessToken, taster.tasterId, "FREE", null);
      onComplete();
    } catch (cause) {
      setError(errorMessage(cause, "구독하지 못했어요. 잠시 후 다시 시도해 주세요."));
      setIsSubmitting(false);
    }
  }

  const current = matches[cursor];
  const following = matches[cursor + 1];
  const name = displayName.trim();
  return (
    <main className="r-screen r-onboarding r-onboarding-signup r-onboarding-match">
      <div className="r-onboarding-signup__content">
        <header className="r-onboarding-heading r-onboarding-match__head">
          <div>
            <span className="r-label">취향 분석 완료</span>
            <h1 className="r-display">
              {name ? `${name}님과` : "나와"} 입맛이
              <br />잘 맞는 맛객이에요
            </h1>
          </div>
          <button type="button" className="r-onboarding-skip" onClick={onComplete} disabled={isSubmitting}>
            나중에
          </button>
        </header>
        {matchState === "loading" ? (
          <EmptyState tone="loading" title="입맛이 맞는 맛객을 찾고 있어요…">
            <MascotArt pose={7} className="r-onboarding-empty-art" />
          </EmptyState>
        ) : !current ? (
          <EmptyState
            tone={matchState === "error" ? "error" : "empty"}
            title={
              matchState === "error"
                ? "맛객 추천을 불러오지 못했어요"
                : matches.length
                  ? "추천 맛객을 모두 봤어요"
                  : "아직 입맛이 맞는 맛객이 없어요"
            }
            message="맛객 탭에서 언제든 더 찾아볼 수 있어요."
            action={matches.length > 0 ? { label: "처음부터 다시 보기", onClick: () => setCursor(0) } : undefined}
          >
            <MascotArt pose={9} className="r-onboarding-empty-art" />
          </EmptyState>
        ) : (
          <div className="r-onboarding-match__stack" {...swipe}>
            {following && <div className="r-onboarding-match__behind" aria-hidden="true" />}
            <TasterMatchCard key={current.taster.tasterId} taster={current.taster} photos={current.photos} />
          </div>
        )}
        {error && (
          <p className="r-onboarding-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="r-onboarding-footer r-onboarding-match__actions">
        {current ? (
          <>
            <button
              type="button"
              className="r-button r-button--secondary r-onboarding-match__pass"
              aria-label="다음 맛객 보기"
              disabled={isSubmitting}
              onClick={nextMatch}
            >
              <Icon name="close" />
            </button>
            <button
              type="button"
              className="r-button r-button--primary r-onboarding-match__subscribe"
              disabled={isSubmitting}
              onClick={() => void subscribe(current.taster)}
            >
              {isSubmitting ? "구독하는 중…" : "첫 구독은 무료 · 구독하기"}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="r-button r-button--primary r-button--block"
            disabled={matchState === "loading"}
            onClick={onComplete}
          >
            맛다공 시작하기
          </button>
        )}
      </div>
    </main>
  );
}
