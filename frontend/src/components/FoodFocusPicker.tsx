import { useId } from "react";
import type { FoodFocus } from "../models/community";
import Icon, { type IconName } from "./Icon";

/** 찾는 분야 세 가지입니다(가입 취향 단계와 프로필 편집이 이 부품으로 함께 고름). */
/** "둘 다"는 포크와 컵 아이콘을 나란히 둡니다(보드 04-03). */
const FOOD_FOCUS_OPTIONS: { value: FoodFocus; label: string; icons: IconName[] }[] = [
  { value: "RESTAURANT", label: "식당", icons: ["fork"] },
  { value: "CAFE_DESSERT", label: "카페", icons: ["coffee"] },
  { value: "BOTH", label: "둘 다", icons: ["fork", "coffee"] },
];

/**
 * 세 분야를 한눈에 비교하고 키보드로도 고를 수 있는 아이콘 라디오 카드입니다(가입 2단계 보드 04-03).
 * chips면 왼쪽 이름표와 한 줄 칩으로 작게 그립니다(프로필 편집 15-03·15-04는 보드에 분야 카드가 없어 태그 위에 작게 둠).
 */
export default function FoodFocusPicker({
  label,
  value,
  onChange,
  variant = "cards",
}: {
  label: string;
  value: FoodFocus;
  onChange: (focus: FoodFocus) => void;
  variant?: "cards" | "chips";
}) {
  const name = useId();
  if (variant === "chips") {
    return (
      <div className="food-focus-chips">
        <span aria-hidden="true">{label}</span>
        <div className="r-chips" role="radiogroup" aria-label={label}>
          {FOOD_FOCUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={value === option.value}
              className={`r-chip ${value === option.value ? "is-on" : ""}`}
              onClick={() => onChange(option.value)}
            >
              {option.icons.map((icon) => (
                <Icon key={icon} name={icon} />
              ))}
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }
  return (
    <fieldset className="food-focus-picker">
      <legend>{label}</legend>
      <div>
        {FOOD_FOCUS_OPTIONS.map((option) => (
          <label key={option.value}>
            <input
              className="visually-hidden"
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>
              {option.icons.map((icon) => (
                <Icon key={icon} name={icon} />
              ))}
              <b>{option.label}</b>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
