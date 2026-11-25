import { useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../components/Icon";
import Sheet from "../components/Sheet";
import { VISIT_RADIUS_LABEL } from "../models/place";
import type { LikeChoice } from "./useLikeChoice";

/**
 * 찬 하트를 눌렀을 때 고르는 시트입니다(보드 10-02). 스토리 보기처럼 시트보다 위에 뜨는 화면에서도 보이도록 문서 끝에 붙입니다.
 * 가볼 곳에서 빼기 · 별로였어요를 고르기 줄(.r-option)로 두고, 별로였어요를 고르면 그 조건(다녀왔거나 가게 근처) 줄을 보여 준 뒤
 * 취소 · 확인으로 정합니다. 내 기록 공개 범위 시트(RecordVisibilitySheet)와 같은 모양(.r-choice-sheet)입니다.
 */
export default function LikeChoiceSheet({
  onChoose,
  onClose,
}: {
  onChoose: (choice: LikeChoice) => void;
  onClose: () => void;
}) {
  const [choice, setChoice] = useState<LikeChoice>("remove");
  const options: { value: LikeChoice; title: string; description: string }[] = [
    { value: "remove", title: "가볼 곳에서 빼기", description: "더 이상 방문할 계획이 없어요." },
    {
      value: "disliked",
      title: "별로였어요",
      description: `직접 방문한 경험이나 가게 ${VISIT_RADIUS_LABEL} 내 위치 확인이 필요해요.`,
    },
  ];
  return createPortal(
    <Sheet
      title="가볼 곳에서 빼기"
      onClose={onClose}
      className="r-choice-sheet"
      backdropClassName="r-like-choice-backdrop"
    >
      <p className="r-choice-sheet__lead">
        이 가게를 가볼 곳 목록에서
        <br />
        제거하시겠어요?
      </p>
      <div className="r-options" role="radiogroup" aria-label="가볼 곳에서 빼는 이유">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={choice === option.value}
            className={`r-option r-option--stacked ${choice === option.value ? "is-on" : ""}`}
            onClick={() => setChoice(option.value)}
          >
            <span className="r-option__radio" aria-hidden="true" />
            <span className="r-option__copy">
              <b>{option.title}</b>
              <small>{option.description}</small>
            </span>
          </button>
        ))}
      </div>
      {choice === "disliked" && (
        <p className="r-choice-sheet__condition">
          <Icon name="pin" />
          <span>
            방문 경험이 있거나
            <br />
            가게로부터 {VISIT_RADIUS_LABEL} 이내에 있어요.
          </span>
          <Icon name="chevron" />
        </p>
      )}
      <div className="r-choice-sheet__actions">
        <button type="button" className="r-button r-button--secondary" onClick={onClose}>
          취소
        </button>
        <button type="button" className="r-button r-button--primary" onClick={() => onChoose(choice)}>
          확인
        </button>
      </div>
    </Sheet>,
    document.body,
  );
}
