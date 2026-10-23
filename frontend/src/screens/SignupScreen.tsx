import { useState } from "react";
import type { FormEvent } from "react";

type SignupScreenProps = {
  accessToken: string;
  displayName: string;
  email: string;
  onComplete: () => void;
};

/** Kakao 인증 뒤 맛다공에 처음 가입하는 사용자에게 서비스별 가입을 마무리하게 합니다. */
export default function SignupScreen({
  accessToken,
  displayName: initialName,
  email: initialEmail,
  onComplete,
}: SignupScreenProps) {
  const [displayName, setDisplayName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch("/auth-api/api/v1/matdagong/membership", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ displayName, email: email.trim() || null }),
      });
      if (!response.ok) {
        const result = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          result?.message ?? "가입을 완료하지 못했어요. 다시 시도해 주세요.",
        );
      }
      onComplete();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "잠시 후 다시 시도해 주세요.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="matdagong-signup">
      <form className="matdagong-signup__card" onSubmit={submit}>
        <p className="matdagong-signup__eyebrow">MATDAGONG</p>
        <h1>맛다공에 오신 걸 환영해요</h1>
        <p className="matdagong-signup__description">
          카카오 인증이 완료됐어요. 맛다공에서 사용할 정보를 확인해 주세요.
        </p>
        <label htmlFor="signup-display-name">닉네임</label>
        <input
          id="signup-display-name"
          required
          maxLength={80}
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
        <label htmlFor="signup-email">
          이메일 <span>선택</span>
        </label>
        <input
          id="signup-email"
          type="email"
          maxLength={320}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="연락용 이메일"
        />
        {error && (
          <p className="matdagong-signup__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? "가입하는 중…" : "맛다공 시작하기"}
        </button>
      </form>
    </main>
  );
}
