/**
 * 앱 시작 단계 화면입니다. React를 그리기 전 상태 안내·오류는 DOM으로 직접 만들고,
 * 로그인 확인이 끝나면 가입 여부에 따라 소개 → 가입 → 앱 순서로 그립니다.
 */
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import IntroScreen from "../screens/onboarding/IntroScreen";
import SignupScreen from "../screens/onboarding/SignupScreen";
import type { MembershipStatus } from "../services/auth";
import { accountIdFromAccessToken } from "../utils/accessToken";
import { onboardingCompletedKey, readStorage, writeStorage } from "../utils/storage";
import App from "./App";
import { logout, readReturnHash } from "./signIn";

function startupPanel(className: string, ...children: HTMLElement[]): void {
  const root = document.getElementById("root");
  if (!root) return;
  const panel = document.createElement("main");
  panel.className = className;
  panel.append(...children);
  root.replaceChildren(panel);
}

export function showStartupStatus(message: string): void {
  const status = document.createElement("p");
  status.textContent = message;
  startupPanel("auth-start-screen", status);
}

export function showSignInError(message: string): void {
  const title = document.createElement("h1");
  title.textContent = "로그인을 이어갈 수 없어요";
  const description = document.createElement("p");
  description.textContent = message;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "다시 로그인";
  retry.addEventListener("click", () => {
    window.location.assign(`/${readReturnHash()}`);
  });
  startupPanel("auth-start-screen auth-start-error", title, description, retry);
}

/** 가입한 계정은 바로 앱을, 아직 가입하지 않은 계정은 서비스 소개(계정별 한 번)와 가입 화면을 먼저 그립니다. */
export function renderMatdagong(root: HTMLElement, accessToken: string, membership: MembershipStatus): void {
  const reactRoot = createRoot(root);
  const renderApp = () =>
    reactRoot.render(
      <StrictMode>
        <App
          accessToken={accessToken}
          displayName={membership.displayName}
          loginProviders={membership.loginProviders ?? []}
          onLogout={() => void logout()}
        />
      </StrictMode>,
    );
  if (membership.registered) {
    renderApp();
    return;
  }
  const renderSignup = () =>
    reactRoot.render(
      <StrictMode>
        <SignupScreen
          accessToken={accessToken}
          displayName={membership.displayName}
          email={membership.email ?? ""}
          onComplete={renderApp}
        />
      </StrictMode>,
    );
  // 서비스 소개는 공통 계정 UUID를 붙인 키로 계정별 한 번만 보여줍니다.
  const onboardingKey = onboardingCompletedKey(accountIdFromAccessToken(accessToken));
  if (readStorage(onboardingKey, "local") === "true") {
    renderSignup();
    return;
  }
  reactRoot.render(
    <StrictMode>
      <IntroScreen
        onComplete={() => {
          writeStorage(onboardingKey, "true", "local");
          renderSignup();
        }}
      />
    </StrictMode>,
  );
}
