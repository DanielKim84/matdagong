import { useEffect, useState } from "react";
import { RETRY_LATER_MESSAGE } from "../../app/AppData";
import { NICKNAME_TAKEN_MESSAGE } from "../../components/NicknameCheckNote";
import { registerMembership } from "../../services/auth";
import { ApiError } from "../../services/http";
import { ensureMyProfile, getTasteTags, importSocialAvatar, updateMyProfile } from "../../services/community";
import { MAX_NICKNAME_LENGTH, type FoodFocus, type TasteTag } from "../../models/community";
import { filterTagsForFocus } from "../../models/tasteTags";
import { errorMessage } from "../../utils/errorMessage";
import type { LoadState } from "./loadMatches";
import SignupMatchStep from "./SignupMatchStep";
import SignupNameStep from "./SignupNameStep";
import SignupTasteStep from "./SignupTasteStep";

type Step = "name" | "taste" | "match";

/** 가입 마지막 프로필 저장에서 닉네임이 겹친 경우입니다(회원 가입 등 다른 요청의 409와 구분). */
class NicknameTakenError extends Error {}

/** 소셜 로그인 뒤 처음 온 사용자가 닉네임 → 취향 → 입맛 맞는 맛객 순서로 가입을 마칩니다. */
export default function SignupScreen({
  accessToken,
  displayName: initialName,
  email: initialEmail,
  profileImageUrl,
  onComplete,
}: {
  accessToken: string;
  displayName: string;
  email: string;
  /** 로그인한 카카오·네이버 계정의 프로필 사진 주소. 사진 제공에 동의하지 않았으면 null입니다. */
  profileImageUrl: string | null;
  onComplete: () => void;
}) {
  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState(initialName.slice(0, MAX_NICKNAME_LENGTH));
  const [email, setEmail] = useState(initialEmail);
  // 소셜 프로필 사진은 처음에 쓰기로 두고, 1단계에서 빼거나 사진을 불러오지 못하면 쓰지 않습니다.
  const [usesSocialPhoto, setUsesSocialPhoto] = useState(!!profileImageUrl);
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

  /** 회원 가입 → 맛객 프로필 만들기 → 취향 저장 → (고른 경우) 소셜 프로필 사진 가져오기 순서입니다. 실패하면 같은 단계에서 다시 시도하고, 끝난 회원 가입은 건너뜁니다. */
  async function finishSignup(tags: string[]): Promise<boolean> {
    setIsSubmitting(true);
    setError("");
    try {
      if (!isMembershipComplete) {
        await registerMembership(accessToken, { displayName, email: email.trim() || null });
        setIsMembershipComplete(true);
      }
      // 취향은 선택 사항입니다. 고르지 않아도 같은 가입 절차로 진행합니다.
      // 1단계에서 확인한 뒤 다른 맛객이 같은 닉네임을 먼저 쓰면, 프로필은 서버가 접미사를 붙여 만들고 아래 수정이 409로
      // 알립니다. 그때는 1단계로 돌아가 다시 고르게 합니다(다시 시도하면 만든 프로필에 고른 이름을 저장).
      const profile = await ensureMyProfile(accessToken, displayName.trim());
      await updateMyProfile(accessToken, {
        nickname: displayName.trim(),
        intro: profile.intro ?? "",
        profileTags: profile.profileTags,
        tasterFocus: profile.tasterFocus,
        activityScope: profile.activityScope,
        activityRegion: profile.activityRegion ?? "",
        preferenceFocus,
        preferenceTags: filterTagsForFocus(tags, preferenceFocus, tasteTags),
        excludedTags: profile.excludedTags,
      }).catch((cause: unknown) => {
        throw cause instanceof ApiError && cause.status === 409 ? new NicknameTakenError() : cause;
      });
      // 사진은 덤이라 가져오지 못해도 가입은 마칩니다(나중에 프로필 편집에서 올릴 수 있음).
      if (profileImageUrl && usesSocialPhoto) {
        await importSocialAvatar(accessToken, profileImageUrl).catch(() => undefined);
      }
      return true;
    } catch (cause) {
      if (cause instanceof NicknameTakenError) {
        setError(`${NICKNAME_TAKEN_MESSAGE} 다른 이름을 정해 주세요.`);
        setStep("name");
        return false;
      }
      setError(errorMessage(cause, RETRY_LATER_MESSAGE));
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
    return (
      <SignupNameStep
        accessToken={accessToken}
        initialName={displayName}
        initialEmail={email}
        socialPhotoUrl={profileImageUrl}
        usesSocialPhoto={usesSocialPhoto}
        onUsesSocialPhotoChange={setUsesSocialPhoto}
        error={error}
        onSubmit={submitName}
      />
    );
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
