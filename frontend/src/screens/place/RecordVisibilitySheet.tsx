import { useState } from "react";
import Icon from "../../components/Icon";
import Sheet from "../../components/Sheet";

type Visibility = "PUBLIC" | "PRIVATE";

const OPTIONS: { value: Visibility; icon: "people" | "lock"; title: string; lines: string[] }[] = [
  { value: "PUBLIC", icon: "people", title: "공개 추천", lines: ["다른 맛객에게도 이 기록을", "추천으로 공유해요."] },
  {
    value: "PRIVATE",
    icon: "lock",
    title: "나만 보기",
    lines: ["내 기록으로만 보관해요.", "사진·메뉴·방문 기록은 그대로 유지돼요."],
  },
];

/**
 * 내 기록 공개 범위(보드 10-03): "기록은 그대로 보존하고, 다른 사람에게 공개할지만 선택할 수 있어요." 아래 공개 추천 / 나만 보기
 * 고르기 줄, 회색 안내, 취소 · 확인입니다. 확인을 눌러야 바꿉니다.
 */
export default function RecordVisibilitySheet({
  current,
  onConfirm,
  onClose,
}: {
  current: Visibility;
  onConfirm: (visibility: Visibility) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState<Visibility>(current);
  return (
    <Sheet title="내 기록 공개 범위" onClose={onClose} className="r-choice-sheet">
      <p className="r-choice-sheet__lead">
        기록은 그대로 보존하고,
        <br />
        다른 사람에게 공개할지만 선택할 수 있어요.
      </p>
      <div className="r-options" role="radiogroup" aria-label="공개 범위">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`r-option r-option--stacked ${value === option.value ? "is-on" : ""}`}
            onClick={() => setValue(option.value)}
          >
            <span className="r-option__radio" aria-hidden="true" />
            <Icon name={option.icon} />
            <span className="r-option__copy">
              <b>{option.title}</b>
              <small>
                {option.lines[0]}
                <br />
                {option.lines[1]}
              </small>
            </span>
          </button>
        ))}
      </div>
      <p className="r-info-note r-choice-sheet__note">
        <Icon name="info" />
        공개 범위를 변경해도 기록이 삭제되거나 하트(가볼 곳)로 전환되지 않아요.
      </p>
      <div className="r-choice-sheet__actions">
        <button type="button" className="r-button r-button--secondary" onClick={onClose}>
          취소
        </button>
        <button
          type="button"
          className="r-button r-button--primary"
          onClick={() => (value === current ? onClose() : onConfirm(value))}
        >
          확인
        </button>
      </div>
    </Sheet>
  );
}
