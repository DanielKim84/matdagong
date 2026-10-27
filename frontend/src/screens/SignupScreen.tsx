import { useEffect, useState, type FormEvent } from "react";
import TasteTagPicker from "../components/TasteTagPicker";
import FoodFocusPicker from "../components/FoodFocusPicker";
import { isVisitCondition } from "../models/place";
import {
  ensureMyProfile,
  getTasteTags,
  updateMyProfile,
  type FoodFocus,
  type TasteTag,
} from "../services/community";

type SignupScreenProps = {
  accessToken: string;
  displayName: string;
  email: string;
  onComplete: () => void;
};

/** Kakao 인증 뒤 맛다공에 처음 가입하는 사용자에게 서비스별 가입을 마무리하게 합니다. */
export default function SignupScreen({
  accessToken,
  displayName: initialName,
  email: initialEmail,
  onComplete,
}: SignupScreenProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tasteTags, setTasteTags] = useState<TasteTag[]>([]);
  const [preferenceTags, setPreferenceTags] = useState<string[]>([]);
  const [preferenceFocus, setPreferenceFocus] = useState<FoodFocus>("BOTH");
  const [membershipComplete, setMembershipComplete] = useState(false);

  useEffect(() => {
    getTasteTags(accessToken)
      .then(setTasteTags)
      .catch(() => setTasteTags([]));
  }, [accessToken]);

  async function finishSignup(selectedPreferences: string[], skipPreferences = false) {
    setSubmitting(true);
    setError("");
    try {
      if (!membershipComplete) {
        const response = await fetch("/auth-api/api/v1/matdagong/membership", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ displayName, email: email.trim() || null }),
        });
        if (!response.ok) {
          const result = (await response.json().catch(() => null)) as {
            message?: string;
          } | null;
          throw new Error(
            result?.message ?? "가입을 완료하지 못했어요. 다시 시도해 주세요.",
          );
        }
        setMembershipComplete(true);
      }
      // 취향 선택은 가입 조건이 아니며, 건너뛰면 빈 목록으로 저장해 추천에 반영하지 않습니다.
      const profile = await ensureMyProfile(accessToken, displayName.trim());
      await updateMyProfile(accessToken, {
        nickname: profile.nickname,
        intro: profile.intro ?? "",
        profileTags: profile.profileTags ?? [],
        tasterFocus: profile.tasterFocus ?? "BOTH",
        preferenceFocus: skipPreferences ? "BOTH" : preferenceFocus,
        preferenceTags: selectedPreferences,
        excludedTags: [],
      });
      onComplete();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void finishSignup(preferenceTags);
  }

  return (
    <main className="matdagong-signup">
      <form className="matdagong-signup__card" onSubmit={submit}>
        <p className="matdagong-signup__eyebrow">MATDAGONG</p>
        <h1>맛다공에 오신 걸 환영해요</h1>
        <p className="matdagong-signup__description">
          카카오 인증이 완료됐어요. 맛다공에서 사용할 정보를 확인해 주세요.
        </p>
        <label htmlFor="signup-display-name">닉네임</label>
        <input
          id="signup-display-name"
          required
          maxLength={30}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value.slice(0, 30))}
        />
        <label htmlFor="signup-email">
          이메일 <span>선택</span>
        </label>
        <input
          id="signup-email"
          type="email"
          maxLength={320}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="연락용 이메일"
        />
        <section className="signup-taste-preferences">
          <div>
            <b>취향 설정 <span>선택</span></b>
            <small>선택한 분야와 취향은 맛객 추천에 활용돼요. 건너뛰어도 설정에서 언제든 추가할 수 있어요.</small>
          </div>
          <FoodFocusPicker
            label="추천 받고 싶은 분야"
            value={preferenceFocus}
            onChange={setPreferenceFocus}
          />
          <TasteTagPicker
            options={tasteTags.filter((tag) => !isVisitCondition(tag.name))}
            value={preferenceTags}
            onChange={setPreferenceTags}
          />
        </section>
        {error && (
          <p className="matdagong-signup__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? "가입하는 중…" : "맛다공 시작하기"}
        </button>
        <button
          type="button"
          className="matdagong-signup__skip"
          disabled={submitting}
          onClick={() => void finishSignup([], true)}
        >
          {submitting ? "처리하는 중…" : "취향 설정 건너뛰기"}
        </button>
      </form>
    </main>
  );
}
