import { useState, type FormEvent } from "react";
import StepProgress from "../../components/StepProgress";

export const MAX_DISPLAY_NAME_LENGTH = 12;
const MAX_EMAIL_LENGTH = 320;

/** 가입 1단계: 닉네임과 연락용 이메일(선택)을 받습니다. 다음 단계로 넘어갈 때 입력값을 onSubmit으로 넘깁니다. */
export default function SignupNameStep({
  initialName,
  initialEmail,
  error,
  onSubmit,
}: {
  initialName: string;
  initialEmail: string;
  error: string;
  onSubmit: (displayName: string, email: string) => void;
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit(displayName, email);
  }

  return (
    <main className="r-screen r-onboarding r-onboarding-signup">
      <form className="r-onboarding-signup__form" onSubmit={submit} noValidate>
        <div className="r-onboarding-signup__content">
          <StepProgress step={1} total={3} label="가입 진행" className="r-onboarding-progress" />
          <header className="r-onboarding-heading">
            <span className="r-label">로그인 완료</span>
            <h1 className="r-display">
              맛다공에서 쓸<br />
              이름을 알려 주세요
            </h1>
            <p className="r-muted">맛객 프로필과 기록에 보이는 이름이에요.</p>
          </header>
          <div className="r-onboarding-field">
            <label htmlFor="signup-display-name">닉네임</label>
            <input
              id="signup-display-name"
              required
              maxLength={MAX_DISPLAY_NAME_LENGTH}
              autoComplete="nickname"
              value={displayName}
              aria-invalid={!!error}
              aria-describedby="signup-display-name-count"
              onChange={(event) => setDisplayName(event.target.value.slice(0, MAX_DISPLAY_NAME_LENGTH))}
            />
            <small id="signup-display-name-count" className="r-muted">
              {displayName.length}/{MAX_DISPLAY_NAME_LENGTH}자
            </small>
          </div>
          <div className="r-onboarding-field">
            <label htmlFor="signup-email">
              이메일 <span>선택</span>
            </label>
            <input
              id="signup-email"
              type="email"
              maxLength={MAX_EMAIL_LENGTH}
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="연락용 이메일"
            />
          </div>
          {error && (
            <p className="r-onboarding-error" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="r-onboarding-footer">
          <button type="submit" className="r-button r-button--primary r-button--block" disabled={!displayName.trim()}>
            다음
          </button>
        </div>
      </form>
    </main>
  );
}
