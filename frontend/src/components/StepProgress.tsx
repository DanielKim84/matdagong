import Icon from "./Icon";

type StepProgressProps = {
  /** 지금 단계(1부터) */
  step: number;
  total: number;
  /** 단계 표시의 이름("가입 진행", "기록 진행") */
  label: string;
  /** 위쪽 가운데 제목("기록 작성"). 있으면 제목 줄 아래에 번호 줄을 둡니다. */
  title?: string;
  /** 없으면 버튼 자리를 비워 번호 줄 위치를 맞춥니다. */
  onBack?: () => void;
  backLabel?: string;
  className?: string;
};

/**
 * 단계형 화면(가입, 기록하기) 위쪽의 이전 버튼과 번호 단계 ①—②—③(보드 04·11)입니다.
 * 지나온 단계와 지금 단계는 코랄 동그라미, 남은 단계는 흰 동그라미에 회색 숫자입니다.
 */
export default function StepProgress({
  step,
  total,
  label,
  title,
  onBack,
  backLabel = "이전 단계",
  className = "",
}: StepProgressProps) {
  const backButton = onBack ? (
    <button type="button" className="r-icon-button r-step-progress__back" onClick={onBack} aria-label={backLabel}>
      <Icon name="back" />
    </button>
  ) : (
    <span className="r-step-progress__spacer" aria-hidden="true" />
  );
  const steps = (
    <ol className="r-step-progress__steps" aria-label={`${label} ${total}단계 중 ${step}단계`}>
      {Array.from({ length: total }, (_, index) => {
        const number = index + 1;
        const state = number < step ? "is-done" : number === step ? "is-current" : "";
        return (
          <li key={number} className={state} aria-current={number === step ? "step" : undefined}>
            <span>{number}</span>
          </li>
        );
      })}
    </ol>
  );

  return (
    <div className={`r-step-progress ${title ? "r-step-progress--titled" : ""} ${className}`}>
      <div className="r-step-progress__row">
        {backButton}
        {title ? <b className="r-step-progress__title">{title}</b> : steps}
        <span className="r-step-progress__spacer" aria-hidden="true" />
      </div>
      {title && steps}
    </div>
  );
}
