import { useEffect, useState } from "react";
import { RETRY_LATER_MESSAGE } from "../../app/AppData";
import { NICKNAME_TAKEN_MESSAGE } from "../../components/NicknameCheckNote";
import { registerMembership } from "../../services/auth";
import { ApiError } from "../../services/http";
import { ensureMyProfile, importSocialAvatar, updateMyProfile, uploadProfileImage } from "../../services/profile";
import { useAvatarDraft } from "../../hooks/useAvatarDraft";
import { getTasteTags } from "../../services/community";
import { MAX_NICKNAME_LENGTH, type FoodFocus, type TasteTag } from "../../models/community";
import { filterTagsForFocus } from "../../models/tasteTags";
import { errorMessage } from "../../utils/errorMessage";
import type { LoadState } from "./loadRecommendations";
import SignupMatchStep from "./SignupMatchStep";
import SignupNameStep from "./SignupNameStep";
import SignupPhotoField from "./SignupPhotoField";
import SignupTasteStep from "./SignupTasteStep";

type Step = "name" | "taste" | "match";

/**
 * 닉네임 칸에 미리 채울 이름입니다. 네이버는 별명을 정하지 않은 계정에 "hosu****"처럼 가린 아이디를 주므로,
 * 가린 글자(*)가 있으면 그대로 쓰지 않고 빈칸에서 시작합니다(카카오 별명은 그대로).
 */
function suggestedNickname(name: string): string {
  return name.includes("*") ? "" : name.trim().slice(0, MAX_NICKNAME_LENGTH);
}

/** 가입 마지막 프로필 저장에서 닉네임이 겹친 경우입니다(회원 가입 등 다른 요청의 409와 구분). */
class NicknameTakenError extends Error {}

/** 소셜 로그인 뒤 처음 온 사용자가 닉네임 → 취향 → 입맛 맞는 맛객 순서로 가입을 마칩니다. */
export default function SignupScreen({
  accessToken,
  displayName: initialName,
  email: initialEmail,
  profileImageUrl,
  onBack,
  onComplete,
}: {
  accessToken: string;
  displayName: string;
  email: string;
  /** 로그인한 카카오·네이버 계정의 프로필 사진 주소. 사진 제공에 동의하지 않았으면 null입니다. */
  profileImageUrl: string | null;
  /** 1단계의 뒤로 버튼(보드 04-02): 서비스 소개로 돌아갑니다. */
  onBack: () => void;
  /** 가입을 마치면 정한 닉네임과 함께 부릅니다(앱이 그 이름으로 시작). */
  onComplete: (displayName: string) => void;
}) {
  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState(() => suggestedNickname(initialName));
  // 프로필 사진은 소셜 사진으로 시작하고, 1단계에서 다른 사진을 고르거나(avatarDraft) 기본 캐릭터로 되돌릴 수 있습니다.
  const [usesSocialPhoto, setUsesSocialPhoto] = useState(!!profileImageUrl);
  const [error, setError] = useState("");
  const avatarDraft = useAvatarDraft(setError);
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

  /** 회원 가입 → 맛객 프로필 만들기 → 취향 저장 → 프로필 사진(고른 파일 올리기 또는 소셜 사진 가져오기) 순서입니다. 실패하면 같은 단계에서 다시 시도하고, 끝난 회원 가입은 건너뜁니다. */
  async function finishSignup(tags: string[]): Promise<boolean> {
    setIsSubmitting(true);
    setError("");
    try {
      if (!isMembershipComplete) {
        // 연락용 이메일은 로그인한 소셜 계정의 것을 그대로 씁니다(가입 화면에서 따로 받지 않음, 보드 04-02).
        await registerMembership(accessToken, { displayName, email: initialEmail.trim() || null });
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
        activityRegions: profile.activityRegions,
        preferenceFocus,
        preferenceTags: filterTagsForFocus(tags, preferenceFocus, tasteTags),
        excludedTags: profile.excludedTags,
      }).catch((cause: unknown) => {
        throw cause instanceof ApiError && cause.status === 409 ? new NicknameTakenError() : cause;
      });
      // 사진은 덤이라 가져오지 못해도 가입은 마칩니다(나중에 프로필 편집에서 올릴 수 있음).
      if (avatarDraft.file) {
        await uploadProfileImage(accessToken, avatarDraft.file).catch(() => undefined);
      } else if (profileImageUrl && usesSocialPhoto) {
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

  function submitName(name: string) {
    setDisplayName(name);
    if (!name.trim()) {
      setError("닉네임을 입력해 주세요.");
      return;
    }
    setError("");
    setStep("taste");
  }

  async function submitTaste(tags: string[]) {
    if (!(await finishSignup(tags))) return;
    // 취향을 고르지 않았어도 3단계로 가서 많이 찾는 맛객을 추천합니다(loadRecommendations).
    setStep("match");
  }

  if (step === "name") {
    return (
      <SignupNameStep
        accessToken={accessToken}
        initialName={displayName}
        photo={
          <SignupPhotoField
            src={avatarDraft.preview ?? (usesSocialPhoto ? profileImageUrl : null)}
            isSocialPhoto={!avatarDraft.file && usesSocialPhoto}
            hasSocialPhoto={!!profileImageUrl}
            name={displayName}
            onChoose={(file) => {
              setError("");
              avatarDraft.choose(file);
            }}
            onRemove={() => {
              avatarDraft.reset();
              setUsesSocialPhoto(false);
            }}
            onUseSocialPhoto={() => {
              avatarDraft.reset();
              setUsesSocialPhoto(true);
            }}
          />
        }
        error={error}
        onBack={onBack}
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

  return (
    <SignupMatchStep
      accessToken={accessToken}
      onBack={() => {
        setError("");
        setStep("taste");
      }}
      onComplete={() => onComplete(displayName.trim())}
    />
  );
}
