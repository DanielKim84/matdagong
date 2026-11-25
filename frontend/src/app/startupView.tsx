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

/** 세로 로고(입체 심볼 + 맛다공 글자, 보드 02-01·02-03)입니다. 한 줄 소개는 접속 중 화면만 붙입니다. */
function brandBlock(withTagline: boolean): HTMLElement {
  const brand = element("div", "auth-start-brand");
  const symbol = element("img", "auth-start-brand__symbol");
  symbol.src = "/assets/brand/app-icon.png";
  symbol.alt = "";
  const name = element("h1", "auth-start-brand__name", "맛다공");
  brand.append(symbol, name);
  if (withTagline) brand.append(element("p", "auth-start-brand__tagline", "맛있는 순간을 함께하는 사람들"));
  return brand;
}

function showPanel(className: string, ...children: HTMLElement[]): void {
  const root = document.getElementById("root");
  if (!root) return;
  const panel = element("main", `auth-start-screen ${className}`);
  panel.append(...children);
  root.replaceChildren(panel);
}

/**
 * 앱을 그리기 전 접속 중 화면입니다(보드 02-01). 세로 로고 아래 프라이팬 캐릭터 장면을 깔고,
 * 둥글게 올라온 흰 판에 안내 문구와 오가는 코랄 진행 막대를 둡니다.
 */
export function showStartupStatus(): void {
  const scene = element("div", "auth-start-scene");
  scene.setAttribute("aria-hidden", "true");
  scene.append(element("span", "auth-start-scene__character"));
  const status = element("section", "auth-start-status");
  status.setAttribute("role", "status");
  const progress = element("span", "auth-start-progress");
  progress.setAttribute("aria-hidden", "true");
  progress.append(element("i"));
  status.append(
    element("h2", "", "계정을 확인하고 있어요"),
    element("p", "auth-start-message", "잠시만 기다려 주세요."),
    progress,
  );
  showPanel("is-loading", brandBlock(true), scene, status);
}

/** 로그인을 이어 가지 못했을 때의 화면입니다(보드 02-03). 다시 로그인하면 돌아갈 화면을 기억한 채 처음부터 시작합니다. */
export function showSignInError(): void {
  const alert = element("span", "auth-start-alert", "!");
  alert.setAttribute("aria-hidden", "true");
  const message = element("p", "auth-start-message");
  for (const [index, line] of [
    "네트워크 연결이 원활하지 않거나",
    "일시적으로 인증에 문제가 발생했어요.",
    "다시 로그인해 주세요.",
  ].entries()) {
    if (index > 0) message.append(element("br"));
    message.append(line);
  }
  const retry = element("button", "auth-start-retry", "다시 로그인");
  retry.type = "button";
  retry.addEventListener("click", () => {
    window.location.assign(`/${readReturnHash()}`);
  });
  const body = element("section", "auth-start-error__body");
  body.setAttribute("role", "alert");
  body.append(alert, element("h2", "", "로그인할 수 없어요"), message);
  showPanel("auth-start-error", brandBlock(false), body, retry);
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
  // 서비스 소개는 공통 계정 UUID를 붙인 키로 계정별 한 번만 보여줍니다. 가입 1단계의 뒤로 버튼으로는 다시 볼 수 있습니다.
  const onboardingKey = onboardingCompletedKey(accountIdFromAccessToken(accessToken));
  const renderIntro = () =>
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
  const renderSignup = () =>
    reactRoot.render(
      <StrictMode>
        <SignupScreen
          accessToken={accessToken}
          displayName={membership.displayName ?? ""}
          email={membership.email ?? ""}
          profileImageUrl={membership.profileImageUrl}
          onBack={renderIntro}
          onComplete={renderApp}
        />
      </StrictMode>,
    );
  if (readStorage(onboardingKey, "local") === "true") renderSignup();
  else renderIntro();
}
