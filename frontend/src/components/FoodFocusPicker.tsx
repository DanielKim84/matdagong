import { useId } from "react";
import Icon, { type IconName } from "./Icon";
import type { FoodFocus } from "../services/community";

const options: { value: FoodFocus; label: string; icon: IconName }[] = [
  { value: "RESTAURANT", label: "음식점", icon: "fork" },
  { value: "CAFE_DESSERT", label: "카페·디저트", icon: "coffee" },
  { value: "BOTH", label: "둘 다", icon: "heart" },
];

/** 세 분야를 한눈에 비교하고 키보드로도 고를 수 있는 라디오 카드입니다. */
export default function FoodFocusPicker({ label, value, onChange }: {
  label: string;
  value: FoodFocus;
  onChange: (focus: FoodFocus) => void;
}) {
  const name = useId();
  return (
    <fieldset className="food-focus-picker">
      <legend>{label}</legend>
      <div>
        {options.map((option) => (
          <label key={option.value}>
            <input className="visually-hidden" type="radio" name={name}
              value={option.value} checked={value === option.value}
              onChange={() => onChange(option.value)} />
            <span><Icon name={option.icon} /><b>{option.label}</b></span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
