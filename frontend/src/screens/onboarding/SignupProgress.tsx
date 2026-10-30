import Icon from "../../components/Icon";

/** 가입 단계 위쪽의 이전 버튼·진행 막대·단계 숫자입니다. */
export default function SignupProgress({ step, total, onBack }: { step: number; total: number; onBack?: () => void }) {
  return (
    <div className="r-onboarding-progress">
      {onBack ? (
        <button type="button" className="r-icon-button r-onboarding-progress__back" onClick={onBack} aria-label="이전 단계">
          <Icon name="back" />
        </button>
      ) : (
        <span className="r-onboarding-progress__spacer" aria-hidden="true" />
      )}
      <div
        className="r-onboarding-progress__bar"
        role="progressbar"
        aria-label="가입 진행"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={step}
      >
        <i style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <span className="r-onboarding-progress__count">{step}/{total}</span>
    </div>
  );
}
