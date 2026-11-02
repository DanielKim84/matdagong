import Icon from "./Icon";

export type StepProgressProps = {
  /** 지금 단계(1부터) */
  step: number;
  total: number;
  /** 진행 막대의 이름("가입 진행", "기록 진행") */
  label: string;
  /** 없으면 버튼 자리를 비워 막대 위치를 맞춥니다. */
  onBack?: () => void;
  /** 첫 단계에서 닫기로 쓸 때 "close" */
  backIcon?: "back" | "close";
  backLabel?: string;
  className?: string;
};

/** 단계형 화면(가입, 기록하기) 위쪽의 이전 버튼·진행 막대·"2/4" 숫자입니다. */
export default function StepProgress({
  step,
  total,
  label,
  onBack,
  backIcon = "back",
  backLabel = "이전 단계",
  className = "",
}: StepProgressProps) {
  const percent = total > 0 ? Math.min(100, Math.max(0, (step / total) * 100)) : 0;
  return (
    <div className={`r-step-progress ${className}`}>
      {onBack ? (
        <button type="button" className="r-icon-button r-step-progress__back" onClick={onBack} aria-label={backLabel}>
          <Icon name={backIcon} />
        </button>
      ) : (
        <span className="r-step-progress__spacer" aria-hidden="true" />
      )}
      <div
        className="r-step-progress__bar"
        role="progressbar"
        aria-label={label}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
      >
        <i style={{ width: `${percent}%` }} />
      </div>
      <span className="r-step-progress__count">
        {step}/{total}
      </span>
    </div>
  );
}
