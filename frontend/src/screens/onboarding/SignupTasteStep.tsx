import MascotArt from "../../components/MascotArt";
import StepProgress from "../../components/StepProgress";
import { EmptyState } from "../../components/ui";
import type { TasteTag } from "../../models/community";
import { MENU_TASTE_TAG_GROUPS } from "../../models/tasteTags";
import type { LoadState } from "./loadMatches";
import TasteChips from "./TasteChips";

// 맛객 추천이 의미 있으려면 취향을 이만큼은 골라야 합니다.
const MIN_TASTE_TAGS = 3;

type Props = {
  tasteTags: TasteTag[];
  tagsState: LoadState;
  value: string[];
  onChange: (tags: string[]) => void;
  error: string;
  isSubmitting: boolean;
  onBack: () => void;
  /** 고른 취향으로 가입을 마칩니다. 빈 배열이면 취향 없이 마칩니다. */
  onSubmit: (tags: string[]) => void;
};

/** 가입 2단계: 메뉴 취향 태그를 고릅니다. */
export default function SignupTasteStep({
  tasteTags,
  tagsState,
  value,
  onChange,
  error,
  isSubmitting,
  onBack,
  onSubmit,
}: Props) {
  const count = value.length;
  // 태그 목록을 못 받으면 취향 없이 가입을 마치고 설정에서 고르게 합니다.
  const hasNoTags = tagsState === "error" || (tagsState === "ready" && !tasteTags.length);
  const hasEnoughTags = hasNoTags || count >= MIN_TASTE_TAGS;
  return (
    <main className="r-screen r-onboarding r-onboarding-signup">
      <div className="r-onboarding-signup__content">
        <StepProgress step={2} total={3} label="가입 진행" onBack={onBack} className="r-onboarding-progress" />
        <header className="r-onboarding-heading">
          <h1 className="r-display">
            어떤 맛을
            <br />
            좋아하세요?
          </h1>
          <p className="r-muted">{MIN_TASTE_TAGS}개 이상 고르면 입맛이 맞는 맛객을 찾아드려요.</p>
        </header>
        {tagsState === "loading" ? (
          <EmptyState tone="loading" title="취향 목록을 불러오고 있어요…" />
        ) : hasNoTags ? (
          <EmptyState
            tone={tagsState === "error" ? "error" : "empty"}
            title="취향 목록을 불러오지 못했어요"
            message="가입을 먼저 마치고, 설정에서 취향을 골라 주세요."
          />
        ) : (
          <TasteChips
            options={tasteTags.filter((tag) => MENU_TASTE_TAG_GROUPS.includes(tag.tagGroup))}
            value={value}
            onChange={onChange}
          />
        )}
        <div className="r-onboarding-note">
          <MascotArt pose={2} className="r-onboarding-note__art" />
          <p>
            고른 취향은 <b>나만 보는 추천용</b>이에요. 프로필에 공개되지 않아요.
          </p>
        </div>
        {error && (
          <p className="r-onboarding-error" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="r-onboarding-footer">
        <button
          type="button"
          className="r-button r-button--primary r-button--block"
          disabled={isSubmitting || !hasEnoughTags}
          onClick={() => onSubmit(hasNoTags ? [] : value)}
        >
          {isSubmitting
            ? "저장하는 중…"
            : tagsState === "loading"
              ? "취향 목록을 불러오는 중…"
              : hasNoTags
                ? "가입 마치기"
                : hasEnoughTags
                  ? `다음 · ${count}개 선택`
                  : `${MIN_TASTE_TAGS - count}개 더 골라 주세요`}
        </button>
        {tagsState === "ready" && !hasNoTags && (
          <button type="button" className="r-onboarding-later" disabled={isSubmitting} onClick={() => onSubmit([])}>
            취향은 나중에 고를게요
          </button>
        )}
      </div>
    </main>
  );
}
