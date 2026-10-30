import { useEffect, useState, type FormEvent } from "react";
import { filterTagsForFocus } from "../models/tasteTags";
import type { Taster } from "../models/place";
import {
  createSubscription,
  ensureMyProfile,
  getTasteTags,
  getTasters,
  updateMyProfile,
  type FoodFocus,
  type TasteTag,
} from "../services/community";
import { apiRequest } from "../services/http";
import { getPlaces } from "../services/places";
import Icon from "../components/Icon";
import { accountIdFromAccessToken } from "../utils/accessToken";
import MascotArt from "./onboarding/MascotArt";
import SignupProgress from "./onboarding/SignupProgress";
import TasteChips from "./onboarding/TasteChips";
import TasterMatchCard from "./onboarding/TasterMatchCard";
import { useSwipe } from "./onboarding/useSwipe";

type SignupScreenProps = {
  accessToken: string;
  displayName: string;
  email: string;
  onComplete: () => void;
};

type Step = "name" | "taste" | "match";
type LoadState = "loading" | "ready" | "error";
type Match = { taster: Taster; photos: string[] };

// 맛객 추천이 의미 있으려면 취향을 이만큼은 골라야 합니다.
const MIN_TASTE_TAGS = 3;
// 가입 단계에서는 분야를 따로 묻지 않고 모든 분야의 취향을 받습니다. 설정에서 바꿀 수 있습니다.
const PREFERENCE_FOCUS: FoodFocus = "BOTH";

/** 공개 기록이 있고 내 취향과 겹치는 맛객을 일치율 순으로 고르고, 각자의 기록 사진을 모읍니다. */
async function loadMatches(accessToken: string): Promise<Match[]> {
  const [tasters, places] = await Promise.all([
    getTasters(accessToken),
    getPlaces("", accessToken).catch(() => null),
  ]);
  const myId = accountIdFromAccessToken(accessToken);
  const photosById = new Map<string, string[]>();
  const publicIds = new Set<string>();
  places?.forEach((place) => place.tasters.forEach((record) => {
    if (record.visibility === "PRIVATE") return;
    publicIds.add(record.tasterId);
    const photos = photosById.get(record.tasterId) ?? [];
    record.photos?.forEach((photo) => {
      if (photos.length < 3 && !photos.includes(photo)) photos.push(photo);
    });
    photosById.set(record.tasterId, photos);
  }));
  return tasters
    .filter((taster) => taster.tasterId !== myId && (taster.matchScore ?? 0) > 0)
    .filter((taster) => !places || publicIds.has(taster.tasterId))
    .sort((left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0))
    .map((taster) => ({ taster, photos: photosById.get(taster.tasterId) ?? [] }));
}

/** Kakao 인증 뒤 처음 온 사용자가 닉네임 → 취향 → 입맛 맞는 맛객 순서로 가입을 마칩니다. */
export default function SignupScreen({
  accessToken,
  displayName: initialName,
  email: initialEmail,
  onComplete,
}: SignupScreenProps) {
  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState(initialName.slice(0, 12));
  const [email, setEmail] = useState(initialEmail ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tasteTags, setTasteTags] = useState<TasteTag[]>([]);
  const [tagsState, setTagsState] = useState<LoadState>("loading");
  const [preferenceTags, setPreferenceTags] = useState<string[]>([]);
  const [membershipComplete, setMembershipComplete] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchState, setMatchState] = useState<LoadState>("loading");
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    getTasteTags(accessToken)
      .then((tags) => {
        setTasteTags(tags);
        setTagsState("ready");
      })
      .catch(() => {
        setTasteTags([]);
        setTagsState("error");
      });
  }, [accessToken]);

  const nextMatch = () => setCursor((current) => current + 1);
  const swipe = useSwipe(nextMatch);

  /** 가입과 취향 저장은 예전과 같은 API 순서로 진행합니다. 실패하면 같은 단계에서 다시 시도할 수 있습니다. */
  async function finishSignup(tags: string[]): Promise<boolean> {
    setSubmitting(true);
    setError("");
    try {
      if (!membershipComplete) {
        await apiRequest<void>("/auth-api/api/v1/matdagong/membership", accessToken, {
          method: "POST",
          body: JSON.stringify({ displayName, email: email.trim() || null }),
          errorMessage: "가입을 완료하지 못했어요. 다시 시도해 주세요.",
        });
        setMembershipComplete(true);
      }
      // 취향은 선택 사항입니다. 고르지 않아도 같은 가입 절차로 진행합니다.
      const profile = await ensureMyProfile(accessToken, displayName.trim());
      await updateMyProfile(accessToken, {
        nickname: profile.nickname,
        intro: profile.intro ?? "",
        profileTags: profile.profileTags ?? [],
        tasterFocus: profile.tasterFocus ?? "BOTH",
        activityScope: profile.activityScope ?? "LOCAL",
        activityRegion: profile.activityRegion ?? "",
        preferenceFocus: PREFERENCE_FOCUS,
        preferenceTags: filterTagsForFocus(tags, PREFERENCE_FOCUS, tasteTags),
        excludedTags: profile.excludedTags ?? [],
      });
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "잠시 후 다시 시도해 주세요.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  function submitName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!displayName.trim()) {
      setError("닉네임을 입력해 주세요.");
      return;
    }
    setError("");
    setStep("taste");
  }

  async function submitTaste(tags: string[]) {
    if (!(await finishSignup(tags))) return;
    if (!tags.length) {
      onComplete();
      return;
    }
    setStep("match");
    setMatchState("loading");
    setCursor(0);
    loadMatches(accessToken)
      .then((items) => {
        setMatches(items);
        setMatchState("ready");
      })
      .catch(() => setMatchState("error"));
  }

  async function subscribe(taster: Taster) {
    setSubmitting(true);
    setError("");
    try {
      await createSubscription(accessToken, taster.tasterId, "FREE", null);
      onComplete();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "구독하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  }

  if (step === "name") {
    return (
      <main className="r-screen r-onboarding r-onboarding-signup">
        <form className="r-onboarding-signup__form" onSubmit={submitName} noValidate>
          <div className="r-onboarding-signup__content">
            <SignupProgress step={1} total={3} />
            <header className="r-onboarding-heading">
              <span className="r-label">카카오 인증 완료</span>
              <h1 className="r-display">맛다공에서 쓸<br />이름을 알려 주세요</h1>
              <p className="r-muted">맛객 프로필과 기록에 보이는 이름이에요.</p>
            </header>
            <div className="r-onboarding-field">
              <label htmlFor="signup-display-name">닉네임</label>
              <input
                id="signup-display-name"
                required
                maxLength={12}
                autoComplete="nickname"
                value={displayName}
                aria-invalid={!!error}
                aria-describedby="signup-display-name-count"
                onChange={(event) => setDisplayName(event.target.value.slice(0, 12))}
              />
              <small id="signup-display-name-count" className="r-muted">{displayName.length}/12자</small>
            </div>
            <div className="r-onboarding-field">
              <label htmlFor="signup-email">이메일 <span>선택</span></label>
              <input
                id="signup-email"
                type="email"
                maxLength={320}
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="연락용 이메일"
              />
            </div>
            {error && <p className="r-onboarding-error" role="alert">{error}</p>}
          </div>
          <div className="r-onboarding-footer">
            <button type="submit" className="r-button r-button--primary r-button--block" disabled={!displayName.trim()}>
              다음
            </button>
          </div>
        </form>
      </main>
    );
  }

  if (step === "taste") {
    const count = preferenceTags.length;
    // 태그 목록을 못 받으면 취향 없이 가입을 마치고 설정에서 고르게 합니다.
    const noTags = tagsState === "error" || (tagsState === "ready" && !tasteTags.length);
    const enough = noTags || count >= MIN_TASTE_TAGS;
    return (
      <main className="r-screen r-onboarding r-onboarding-signup">
        <div className="r-onboarding-signup__content">
          <SignupProgress step={2} total={3} onBack={() => { setError(""); setStep("name"); }} />
          <header className="r-onboarding-heading">
            <h1 className="r-display">어떤 맛을<br />좋아하세요?</h1>
            <p className="r-muted">{MIN_TASTE_TAGS}개 이상 고르면 입맛이 맞는 맛객을 찾아드려요.</p>
          </header>
          {tagsState === "loading" ? (
            <div className="r-empty" role="status"><p>취향 목록을 불러오고 있어요…</p></div>
          ) : noTags ? (
            <div className="r-empty">
              <b>취향 목록을 불러오지 못했어요</b>
              <p>가입을 먼저 마치고, 설정에서 취향을 골라 주세요.</p>
            </div>
          ) : (
            <TasteChips
              options={tasteTags.filter((tag) => tag.tagGroup !== "VISIT")}
              value={preferenceTags}
              onChange={setPreferenceTags}
            />
          )}
          <div className="r-onboarding-note">
            <MascotArt pose={2} className="r-onboarding-note__art" />
            <p>고른 취향은 <b>나만 보는 추천용</b>이에요. 프로필에 공개되지 않아요.</p>
          </div>
          {error && <p className="r-onboarding-error" role="alert">{error}</p>}
        </div>
        <div className="r-onboarding-footer">
          <button
            type="button"
            className="r-button r-button--primary r-button--block"
            disabled={submitting || !enough}
            onClick={() => void submitTaste(noTags ? [] : preferenceTags)}
          >
            {submitting
              ? "저장하는 중…"
              : tagsState === "loading"
                ? "취향 목록을 불러오는 중…"
                : noTags
                  ? "가입 마치기"
                  : enough
                    ? `다음 · ${count}개 선택`
                    : `${MIN_TASTE_TAGS - count}개 더 골라 주세요`}
          </button>
          {tagsState === "ready" && !noTags && (
            <button
              type="button"
              className="r-onboarding-later"
              disabled={submitting}
              onClick={() => void submitTaste([])}
            >
              취향은 나중에 고를게요
            </button>
          )}
        </div>
      </main>
    );
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
            <h1 className="r-display">{name ? `${name}님과` : "나와"} 입맛이<br />잘 맞는 맛객이에요</h1>
          </div>
          <button type="button" className="r-onboarding-skip" onClick={onComplete} disabled={submitting}>
            나중에
          </button>
        </header>
        {matchState === "loading" ? (
          <div className="r-empty" role="status">
            <MascotArt pose={7} className="r-onboarding-empty-art" />
            <p>입맛이 맞는 맛객을 찾고 있어요…</p>
          </div>
        ) : !current ? (
          <div className="r-empty">
            <MascotArt pose={9} className="r-onboarding-empty-art" />
            <b>{matchState === "error"
              ? "맛객 추천을 불러오지 못했어요"
              : matches.length ? "추천 맛객을 모두 봤어요" : "아직 입맛이 맞는 맛객이 없어요"}</b>
            <p>맛객 탭에서 언제든 더 찾아볼 수 있어요.</p>
            {matches.length > 0 && (
              <button type="button" className="r-button r-button--secondary r-button--pill" onClick={() => setCursor(0)}>
                처음부터 다시 보기
              </button>
            )}
          </div>
        ) : (
          <div className="r-onboarding-match__stack" {...swipe}>
            {following && <div className="r-onboarding-match__behind" aria-hidden="true" />}
            <TasterMatchCard key={current.taster.tasterId} taster={current.taster} photos={current.photos} />
          </div>
        )}
        {error && <p className="r-onboarding-error" role="alert">{error}</p>}
      </div>
      <div className="r-onboarding-footer r-onboarding-match__actions">
        {current ? (
          <>
            <button
              type="button"
              className="r-button r-button--secondary r-onboarding-match__pass"
              aria-label="다음 맛객 보기"
              disabled={submitting}
              onClick={nextMatch}
            >
              <Icon name="close" />
            </button>
            <button
              type="button"
              className="r-button r-button--primary r-onboarding-match__subscribe"
              disabled={submitting}
              onClick={() => void subscribe(current.taster)}
            >
              {submitting ? "구독하는 중…" : "첫 구독은 무료 · 구독하기"}
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
