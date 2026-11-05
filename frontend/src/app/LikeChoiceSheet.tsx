import { createPortal } from "react-dom";
import Icon from "../components/Icon";
import Sheet from "../components/Sheet";
import {
  LIKE_CHOICES,
  VISIT_CHOICES,
  VISIT_PROOF_HINT,
  type LikeChoice,
  type LikeChoicePrompt,
  type LikeState,
} from "./useLikeChoice";

const TITLES: Record<LikeState, string> = {
  none: "어떤 곳으로 저장할까요?",
  want: "다녀오셨나요?",
  tasted: "내 맛집 바꾸기",
};

const OPTIONS: Record<
  Exclude<LikeChoice, "remove">,
  { icon: "heart" | "check" | "close"; label: string; hint: string }
> = {
  want: { icon: "heart", label: "가 보고 싶어요", hint: "내 지도의 가볼 곳에 저장해 두고 나중에 가 봐요." },
  tasted: {
    icon: "check",
    label: "다녀왔어요 · 입맛에 맞았어요",
    hint: "이 맛집을 기록한 맛객과 서로 신뢰가 쌓여요.",
  },
  disliked: {
    icon: "close",
    label: "다녀왔는데 별로였어요",
    hint: "내 맛집에서 빼고, 이 맛집을 기록한 맛객과의 신뢰에 반영해요.",
  },
};

/**
 * 하트를 눌렀을 때 고르는 시트입니다. 스토리 보기처럼 시트보다 위에 뜨는 화면에서도 보이도록 문서 끝에 붙입니다.
 * 고를 수 있는 것은 지금 하트 상태(LIKE_CHOICES)에 따라 달라집니다.
 */
export default function LikeChoiceSheet({
  prompt,
  onChoose,
  onClose,
}: {
  prompt: LikeChoicePrompt;
  onChoose: (choice: LikeChoice) => void;
  onClose: () => void;
}) {
  const choices = LIKE_CHOICES[prompt.state];
  return createPortal(
    <Sheet
      title={TITLES[prompt.state]}
      onClose={onClose}
      className="r-like-choice"
      backdropClassName="r-like-choice-backdrop"
    >
      <p className="r-like-choice__place">‘{prompt.placeName}’</p>
      <div className="r-like-choice__list">
        {choices.map((choice) => {
          if (choice === "remove") return null;
          // 들른 근거가 없으면 다녀온 맛은 고를 수 없게 두고, 무엇을 하면 고를 수 있는지 알려 줍니다.
          const isLocked = VISIT_CHOICES.includes(choice) && !prompt.hasVisitProof;
          return (
            <button
              key={choice}
              type="button"
              className={`r-like-choice__option r-like-choice__option--${choice}`}
              onClick={() => onChoose(choice)}
              disabled={isLocked}
            >
              <span className="r-like-choice__icon" aria-hidden="true">
                <Icon name={isLocked ? "lock" : OPTIONS[choice].icon} filled={choice === "want"} />
              </span>
              <span className="r-like-choice__copy">
                <b>{OPTIONS[choice].label}</b>
                <small>{isLocked ? VISIT_PROOF_HINT : OPTIONS[choice].hint}</small>
              </span>
            </button>
          );
        })}
      </div>
      {choices.includes("remove") && (
        <button type="button" className="r-text-button r-like-choice__remove" onClick={() => onChoose("remove")}>
          하트 지우기
        </button>
      )}
    </Sheet>,
    document.body,
  );
}
