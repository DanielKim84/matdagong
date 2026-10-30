import { useEffect, useState, type FormEvent } from "react";
import TasteTagPicker from "../components/TasteTagPicker";
import FoodFocusPicker from "../components/FoodFocusPicker";
import { filterTagsForFocus } from "../models/tasteTags";
import {
  ensureMyProfile,
  getTasteTags,
  updateMyProfile,
  type FoodFocus,
  type TasteTag,
} from "../services/community";
import { apiRequest } from "../services/http";

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
  const [displayName, setDisplayName] = useState(initialName.slice(0, 12));
  const [email, setEmail] = useState(initialEmail ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [tasteTags, setTasteTags] = useState<TasteTag[]>([]);
  const [preferenceTags, setPreferenceTags] = useState<string[]>([]);
  const [excludedTags, setExcludedTags] = useState<string[]>([]);
  const [preferenceFocus, setPreferenceFocus] = useState<FoodFocus>("BOTH");
  const [membershipComplete, setMembershipComplete] = useState(false);

  useEffect(() => {
    getTasteTags(accessToken)
      .then(setTasteTags)
      .catch(() => setTasteTags([]));
  }, [accessToken]);

  async function finishSignup() {
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
        preferenceFocus,
        preferenceTags: filterTagsForFocus(preferenceTags, preferenceFocus, tasteTags),
        excludedTags,
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
    void finishSignup();
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
          maxLength={12}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value.slice(0, 12))}
        />
        <small>{displayName.length}/12자</small>
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
            <small>선택한 분야와 취향은 맛객 추천에 활용돼요. 선택하지 않아도 가입할 수 있고, 설정에서 언제든 바꿀 수 있어요.</small>
          </div>
          <FoodFocusPicker
            label="추천 받고 싶은 분야"
            value={preferenceFocus}
            onChange={(focus) => {
              setPreferenceFocus(focus);
              setPreferenceTags((current) => filterTagsForFocus(current, focus, tasteTags));
            }}
          />
          <TasteTagPicker
            options={tasteTags.filter((tag) => tag.tagGroup !== "VISIT")}
            value={preferenceTags}
            onChange={setPreferenceTags}
            focus={preferenceFocus}
          />
          <section className="signup-taste-avoid">
            <div>
              <b>피하고 싶은 조건 <span>선택</span></b>
              <small>선택한 조건이 등록된 맛집은 홈과 지도 추천에서 제외돼요.</small>
            </div>
            <TasteTagPicker
              options={tasteTags.filter((tag) => tag.tagGroup === "VISIT")}
              value={excludedTags}
              onChange={setExcludedTags}
              groupsToShow={["VISIT"]}
              showCategoryLabels={false}
            />
          </section>
        </section>
        {error && (
          <p className="matdagong-signup__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? "가입하는 중…" : "가입하기"}
        </button>
      </form>
    </main>
  );
}
