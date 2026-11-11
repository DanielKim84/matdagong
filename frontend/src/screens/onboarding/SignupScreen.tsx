import { useEffect, useState } from "react";
import { registerMembership } from "../../services/auth";
import { ensureMyProfile, getTasteTags, updateMyProfile } from "../../services/community";
import { MAX_NICKNAME_LENGTH, type FoodFocus, type TasteTag } from "../../models/community";
import { filterTagsForFocus } from "../../models/tasteTags";
import { errorMessage } from "../../utils/errorMessage";
import type { LoadState } from "./loadMatches";
import SignupMatchStep from "./SignupMatchStep";
import SignupNameStep from "./SignupNameStep";
import SignupTasteStep from "./SignupTasteStep";

type Step = "name" | "taste" | "match";

/** 소셜 로그인 뒤 처음 온 사용자가 닉네임 → 취향 → 입맛 맞는 맛객 순서로 가입을 마칩니다. */
export default function SignupScreen({
  accessToken,
  displayName: initialName,
  email: initialEmail,
  onComplete,
}: {
  accessToken: string;
  displayName: string;
  email: string;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState(initialName.slice(0, MAX_NICKNAME_LENGTH));
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tasteTags, setTasteTags] = useState<TasteTag[]>([]);
  const [tagsState, setTagsState] = useState<LoadState>("loading");
  // 찾는 분야는 처음에 모든 분야로 두고, 고르면 그 분야의 태그 분류만 보여 줍니다. 설정에서 다시 바꿀 수 있습니다.
  const [preferenceFocus, setPreferenceFocus] = useState<FoodFocus>("BOTH");
  const [preferenceTags, setPreferenceTags] = useState<string[]>([]);
  const [isMembershipComplete, setIsMembershipComplete] = useState(false);

  useEffect(() => {
    let active = true;
    getTasteTags(accessToken)
      .then((tags) => {
        if (!active) return;
        setTasteTags(tags);
        setTagsState("ready");
      })
      .catch(() => {
        if (!active) return;
        setTasteTags([]);
        setTagsState("error");
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  /** 회원 가입 → 맛객 프로필 만들기 → 취향 저장 순서입니다. 실패하면 같은 단계에서 다시 시도하고, 끝난 회원 가입은 건너뜁니다. */
  async function finishSignup(tags: string[]): Promise<boolean> {
    setIsSubmitting(true);
    setError("");
    try {
      if (!isMembershipComplete) {
        await registerMembership(accessToken, { displayName, email: email.trim() || null });
        setIsMembershipComplete(true);
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
        preferenceTags: filterTagsForFocus(tags, preferenceFocus, tasteTags),
        excludedTags: profile.excludedTags ?? [],
      });
      return true;
    } catch (cause) {
      setError(errorMessage(cause, "잠시 후 다시 시도해 주세요."));
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  function submitName(name: string, nextEmail: string) {
    setDisplayName(name);
    setEmail(nextEmail);
    if (!name.trim()) {
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
  }

  if (step === "name") {
    return <SignupNameStep initialName={displayName} initialEmail={email} error={error} onSubmit={submitName} />;
  }

  if (step === "taste") {
    return (
      <SignupTasteStep
        tasteTags={tasteTags}
        tagsState={tagsState}
        focus={preferenceFocus}
        onFocusChange={(focus) => {
          setPreferenceFocus(focus);
          // 숨겨지는 분류의 태그는 고른 목록에서도 뺍니다(프로필 편집과 같은 규칙).
          setPreferenceTags((current) => filterTagsForFocus(current, focus, tasteTags));
        }}
        value={preferenceTags}
        onChange={setPreferenceTags}
        error={error}
        isSubmitting={isSubmitting}
        onBack={() => {
          setError("");
          setStep("name");
        }}
        onSubmit={(tags) => void submitTaste(tags)}
      />
    );
  }

  return <SignupMatchStep accessToken={accessToken} displayName={displayName} onComplete={onComplete} />;
}
