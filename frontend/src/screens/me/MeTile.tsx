import Icon, { type IconName } from "../../components/Icon";

/** 나 탭에서 다른 화면으로 가는 벤토 타일입니다. */
export default function MeTile({
  icon,
  value,
  label,
  onClick,
  tone = "default",
  caption,
}: {
  icon: IconName;
  value: string;
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
