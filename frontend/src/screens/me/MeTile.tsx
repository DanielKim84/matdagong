import type { ReactNode } from "react";
import Icon, { type IconName } from "../../components/Icon";

/** 나 탭에서 다른 화면으로 가는 벤토 타일입니다. value에 숫자 두 개를 나란히 넣을 때는 MeTilePair를 씁니다. */
export default function MeTile({
  icon,
  value,
  label,
  onClick,
  tone = "default",
  caption,
}: {
  icon: IconName;
  value: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "default" | "amber";
  caption?: string;
}) {
  return (
    <button type="button" className={`r-card r-me-tile r-me-tile--${tone}`} onClick={onClick}>
      <span className="r-badge-icon r-me-tile__icon">
        <Icon name={icon} />
      </span>
      <b className="r-me-tile__value">{value}</b>
      <span className="r-me-tile__label">{label}</span>
      {caption && <small className="r-me-tile__caption">{caption}</small>}
    </button>
  );
}

/** 타일 하나에 숫자 두 개(예: 구독 중 · 나를 구독)를 이름과 함께 나란히 보여 줍니다. */
export function MeTilePair({ items }: { items: { count: number; label: string }[] }) {
  return (
    <span className="r-me-tile__pair">
      {items.map((item) => (
        <span key={item.label}>
          <b>{item.count}</b>
          <small>{item.label}</small>
        </span>
      ))}
    </span>
  );
}
