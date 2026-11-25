import FoodFocusPicker from "../../components/FoodFocusPicker";
import TasteTagPicker from "../../components/TasteTagPicker";
import StepProgress from "../../components/StepProgress";
import { EmptyState } from "../../components/ui";
import type { FoodFocus, TasteTag } from "../../models/community";
import { groupsForFocus, type TasteTagGroup } from "../../models/tasteTags";
import type { LoadState } from "./loadRecommendations";

/**
 * 가입 때 칩을 바로 펼쳐 보여 주는 분류입니다(보드 04-03: 음식 종류 · 맛·메뉴 · 이럴 때, 카페면 카페·디저트).
 * 여행·분위기는 나중에 골라도 되는 덤이라 프로필 편집처럼 분류 줄만 두고 누르면 시트에서 고릅니다.
 * 취향 %는 내가 고른 분류만 세므로(TasteMatch) 덤을 안 골라도 추천이 되고, 하나도 안 골라도 인기 맛객을 추천합니다(loadRecommendations).
 */
const FIRST_GROUPS: readonly TasteTagGroup[] = ["CUISINE", "TASTE", "CAFE", "DESSERT", "OCCASION"];

type Props = {
  tasteTags: TasteTag[];
  tagsState: LoadState;
  focus: FoodFocus;
  onFocusChange: (focus: FoodFocus) => void;
  value: string[];
  onChange: (tags: string[]) => void;
  error: string;
  isSubmitting: boolean;
  onBack: () => void;
  /** 고른 취향으로 다음 단계로 갑니다. 빈 배열이면 취향 없이 갑니다. */
  onSubmit: (tags: string[]) => void;
};

/**
 * 가입 2단계 · 추천 취향(보드 04-03): "어떤 맛집을 찾으시나요?" → 찾는 분야(식당·카페·둘 다) → 분류마다 "음식 종류 2/10"처럼 제목과
 * 칩을 바로 펼쳐 고르고(TasteTagPicker inline), 여행·분위기는 "더 고르기" 아래 분류 줄을 눌러 시트에서 고릅니다. 고르지 않아도 다음으로 갑니다.
 * 나중에 프로필 편집의 추천 취향에서 바꿀 수 있습니다.
 */
export default function SignupTasteStep({
  tasteTags,
  tagsState,
  focus,
  onFocusChange,
  value,
  onChange,
  error,
  isSubmitting,
  onBack,
  onSubmit,
}: Props) {
  const groups = groupsForFocus(focus);
  const firstGroups = groups.filter((group) => FIRST_GROUPS.includes(group));
  const moreGroups = groups.filter((group) => !FIRST_GROUPS.includes(group));
  // 태그 목록을 못 받으면 취향 없이 가입을 마치고 설정에서 고르게 합니다.
  const hasNoTags = tagsState === "error" || (tagsState === "ready" && !tasteTags.length);
  return (
    <main className="r-screen r-onboarding r-onboarding-signup r-signup-step">
      <StepProgress step={2} total={3} label="가입 진행" onBack={onBack} className="r-onboarding-progress" />
      <div className="r-onboarding-signup__content">
        <header className="r-onboarding-heading">
          <h1 className="r-display">어떤 맛집을 찾으시나요?</h1>
          <p className="r-muted">관심 있는 분야와 좋아하는 태그를 골라주세요.</p>
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
          <>
            <FoodFocusPicker label="찾는 분야" value={focus} onChange={onFocusChange} />
            <section className="r-onboarding-section" aria-label="좋아하는 취향">
              <TasteTagPicker options={tasteTags} value={value} onChange={onChange} groups={firstGroups} inline />
            </section>
            {moreGroups.length > 0 && (
              <section className="r-onboarding-section" aria-labelledby="signup-more-title">
                <h2 id="signup-more-title" className="r-onboarding-subhead">
                  더 고르기 <small>선택 · 나중에 골라도 돼요</small>
                </h2>
                <TasteTagPicker options={tasteTags} value={value} onChange={onChange} groups={moreGroups} />
              </section>
            )}
          </>
        )}
        {error && (
          <p className="r-error-text" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="r-onboarding-footer">
        <button
          type="button"
          className="r-button r-button--primary r-button--block"
          disabled={isSubmitting || tagsState === "loading"}
          onClick={() => onSubmit(hasNoTags ? [] : value)}
        >
          {isSubmitting ? "저장하는 중…" : "다음"}
        </button>
      </div>
    </main>
  );
}
