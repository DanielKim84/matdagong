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

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = ""): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** 로고 → 캐릭터 무대 → 문구 순서로 화면 가운데에 둡니다. */
function startupPanel(className: string, ...children: HTMLElement[]): void {
  const root = document.getElementById("root");
  if (!root) return;
  const logo = element("img", "auth-start-logo");
  logo.src = "/assets/brand-logo.png";
  logo.alt = "맛다공";
  const panel = element("main", `auth-start-screen ${className}`);
  panel.append(logo, mascotStage(), ...children);
  root.replaceChildren(panel);
}

/** 접시 위 프라이팬 캐릭터와 바닥 그림자, 접시를 도는 코랄 고리(접속 중일 때만 돎)입니다. 장식이라 읽히지 않습니다. */
function mascotStage(): HTMLElement {
  const stage = element("div", "auth-start-stage");
  stage.setAttribute("aria-hidden", "true");
  stage.append(
    element("span", "auth-start-stage__ring"),
    element("span", "auth-start-stage__plate"),
    element("span", "auth-start-stage__shadow"),
    element("span", "auth-start-stage__character"),
  );
  return stage;
}

/** 앱을 그리기 전 접속 중 화면입니다. 문구 아래 점 세 개가 차례로 숨 쉬듯 움직입니다. */
export function showStartupStatus(message: string): void {
  const status = element("p", "auth-start-message", message);
  status.setAttribute("role", "status");
  const dots = element("span", "auth-start-dots");
  dots.setAttribute("aria-hidden", "true");
  dots.append(element("i"), element("i"), element("i"));
  startupPanel("is-loading", status, dots);
}

export function showSignInError(message: string): void {
  const retry = element("button", "", "다시 로그인");
  retry.type = "button";
  retry.addEventListener("click", () => {
    window.location.assign(`/${readReturnHash()}`);
  });
  startupPanel(
    "auth-start-error",
    element("h1", "", "로그인을 이어갈 수 없어요"),
    element("p", "auth-start-message", message),
    retry,
  );
}

/** 가입한 계정은 바로 앱을, 아직 가입하지 않은 계정은 서비스 소개(계정별 한 번)와 가입 화면을 먼저 그립니다. */
export function renderMatdagong(root: HTMLElement, accessToken: string, membership: MembershipStatus): void {
  const reactRoot = createRoot(root);
  // 가입을 마치면 가입 화면에서 정한 닉네임으로 앱을 그립니다(가입 전 계정 이름은 비어 있을 수 있음).
  const renderApp = (displayName = membership.displayName ?? "") =>
    reactRoot.render(
      <StrictMode>
        <App
          accessToken={accessToken}
          displayName={displayName}
          loginProviders={membership.loginProviders}
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
          displayName={membership.displayName ?? ""}
          email={membership.email ?? ""}
          profileImageUrl={membership.profileImageUrl}
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
