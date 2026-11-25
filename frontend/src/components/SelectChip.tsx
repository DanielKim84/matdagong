import Icon from "./Icon";

/**
 * 누르면 고르기 목록이 열리는 알약 칩("가까운 곳 ▾", "전체 ▾", 보드 05-01·04-04)입니다.
 * 휴대폰의 기본 고르기 창을 그대로 쓰도록 select를 칩 모양으로 그립니다. label은 화면 읽기용 이름입니다.
 */
export default function SelectChip<T extends string>({
  label,
  value,
  options,
  onChange,
  className = "",
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <label className={`r-select-chip ${className}`}>
      <span className="visually-hidden">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as T)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <Icon name="chevron-down" />
    </label>
  );
}
