import { useState, type FormEvent, type ReactNode } from "react";
import NicknameCheckNote from "../../components/NicknameCheckNote";
import StepProgress from "../../components/StepProgress";
import { useNicknameCheck } from "../../hooks/useNicknameCheck";
import { MAX_NICKNAME_LENGTH } from "../../models/community";

/**
 * 가입 1단계 · 이름과 사진(보드 04-02): 단계 표시 → "프로필을 만들어주세요." → 가운데 큰 프로필 사진(photo, SignupPhotoField)
 * → 닉네임 → 다음. 사진 상태는 다음 단계에서도 남도록 SignupScreen이 들고 있습니다. 연락용 이메일은 로그인한 계정의 것을 그대로 씁니다.
 * 입력하는 동안 다른 맛객이 쓰는 닉네임인지 확인하고, 겹치거나 확인 중이면 다음으로 넘어가지 않습니다.
 */
export default function SignupNameStep({
  accessToken,
  initialName,
  photo,
  error,
  onBack,
  onSubmit,
}: {
  accessToken: string;
  initialName: string;
  photo: ReactNode;
  error: string;
  onBack: () => void;
  onSubmit: (displayName: string) => void;
}) {
  const [displayName, setDisplayName] = useState(initialName);
  const nicknameCheck = useNicknameCheck(accessToken, displayName);
  const canSubmit = !!displayName.trim() && nicknameCheck !== "taken" && nicknameCheck !== "checking";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (canSubmit) onSubmit(displayName);
  }

  return (
    <main className="r-screen r-onboarding r-onboarding-signup r-signup-step">
      <form className="r-onboarding-signup__form" onSubmit={submit} noValidate>
        <StepProgress
          step={1}
          total={3}
          label="가입 진행"
          onBack={onBack}
          backLabel="서비스 소개로"
          className="r-onboarding-progress"
        />
        <div className="r-onboarding-signup__content">
          <header className="r-onboarding-heading">
            <h1 className="r-display">프로필을 만들어주세요.</h1>
            <p className="r-muted">맛다공에서 사용할 사진과 닉네임이에요.</p>
          </header>
          {photo}
          <div className="r-onboarding-field">
            <label htmlFor="signup-display-name">닉네임</label>
            <span className="r-onboarding-field__input">
              <input
                id="signup-display-name"
                required
                maxLength={MAX_NICKNAME_LENGTH}
                autoComplete="nickname"
                value={displayName}
                aria-invalid={!!error || nicknameCheck === "taken"}
                aria-describedby="signup-display-name-check"
                onChange={(event) => setDisplayName(event.target.value.slice(0, MAX_NICKNAME_LENGTH))}
              />
              <small aria-label={`${displayName.length}자, 최대 ${MAX_NICKNAME_LENGTH}자`}>
                {displayName.length}/{MAX_NICKNAME_LENGTH}
              </small>
            </span>
            <NicknameCheckNote id="signup-display-name-check" check={nicknameCheck} />
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
