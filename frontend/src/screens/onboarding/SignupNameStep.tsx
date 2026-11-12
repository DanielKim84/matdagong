import { useState, type FormEvent } from "react";
import NicknameCheckNote from "../../components/NicknameCheckNote";
import StepProgress from "../../components/StepProgress";
import { useNicknameCheck } from "../../hooks/useNicknameCheck";
import { MAX_NICKNAME_LENGTH } from "../../models/community";

const MAX_EMAIL_LENGTH = 320;

/**
 * 가입 1단계: 닉네임과 연락용 이메일(선택)을 받습니다. 다음 단계로 넘어갈 때 입력값을 onSubmit으로 넘깁니다.
 * 입력하는 동안 다른 맛객이 쓰는 닉네임인지 확인하고, 겹치거나 확인 중이면 다음으로 넘어가지 않습니다.
 */
export default function SignupNameStep({
  accessToken,
  initialName,
  initialEmail,
  error,
  onSubmit,
}: {
  accessToken: string;
  initialName: string;
  initialEmail: string;
  error: string;
  onSubmit: (displayName: string, email: string) => void;
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const nicknameCheck = useNicknameCheck(accessToken, displayName);
  const canSubmit = !!displayName.trim() && nicknameCheck !== "taken" && nicknameCheck !== "checking";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) onSubmit(displayName, email);
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
              maxLength={MAX_NICKNAME_LENGTH}
              autoComplete="nickname"
              value={displayName}
              aria-invalid={!!error || nicknameCheck === "taken"}
              aria-describedby="signup-display-name-count signup-display-name-check"
              onChange={(event) => setDisplayName(event.target.value.slice(0, MAX_NICKNAME_LENGTH))}
            />
            <small id="signup-display-name-count" className="r-muted">
              {displayName.length}/{MAX_NICKNAME_LENGTH}자
            </small>
            <NicknameCheckNote id="signup-display-name-check" check={nicknameCheck} />
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
            <p className="r-error-text" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="r-onboarding-footer">
          <button type="submit" className="r-button r-button--primary r-button--block" disabled={!canSubmit}>
            다음
          </button>
        </div>
      </form>
    </main>
  );
}
