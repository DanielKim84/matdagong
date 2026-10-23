import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import SignupScreen from "./screens/SignupScreen";
import "./styles/app.css";
import "./styles/screens.css";
import "./styles/auth-start.css";

const AUTHORIZATION_SERVER =
  import.meta.env.VITE_AUTH_SERVER_URL ?? "http://localhost:5840";
const CLIENT_ID = import.meta.env.VITE_AUTH_CLIENT_ID ?? "matdagong-web-dev";
const REDIRECT_URI =
  import.meta.env.VITE_AUTH_REDIRECT_URI ??
  `${window.location.origin}/auth/callback`;
const ACCESS_TOKEN_KEY = "matdagong.auth.access-token";
const TOKEN_EXPIRY_KEY = "matdagong.auth.expires-at";
const STATE_KEY = "matdagong.auth.oauth-state";
const VERIFIER_KEY = "matdagong.auth.pkce-verifier";

type MembershipStatus = {
  registered: boolean;
  displayName: string;
  email: string | null;
};

/** 맛다공 인증 정보를 지우고 공통 인증을 다시 시작해 로그인 뒤 앱으로 돌아오게 합니다. */
async function logout(): Promise<void> {
  try {
    // 공통 서버 세션도 끊어 다음 방문에서 이전 SSO 세션이 재사용되지 않게 합니다.
    await fetch("/auth-api/auth/session/clear", { method: "POST" });
  } catch {
    // 서버에 닿지 못해도 현재 탭의 인증 정보를 지우고 로그인을 다시 시작합니다.
  } finally {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    // 로그인 페이지만 열면 인증 완료 후 돌아올 앱이 없어지므로 OAuth 흐름을 다시 시작합니다.
    await beginSignIn();
  }
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function randomBase64Url(byteLength: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

async function beginSignIn(): Promise<void> {
  // PKCE verifier는 브라우저 탭에만 보관하고, 공개 클라이언트에는 secret을 두지 않습니다.
  const verifier = randomBase64Url(32);
  const state = randomBase64Url(32);
  const challenge = base64Url(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)),
    ),
  );
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(VERIFIER_KEY, verifier);

  const authorizationUrl = new URL("/oauth2/authorize", AUTHORIZATION_SERVER);
  authorizationUrl.search = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: "openid profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();
  window.location.assign(authorizationUrl.toString());
}

async function completeSignIn(): Promise<void> {
  const callback = new URL(window.location.href);
  const code = callback.searchParams.get("code");
  const returnedState = callback.searchParams.get("state");
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);

  if (callback.searchParams.has("error")) {
    throw new Error("공통 계정 인증이 완료되지 않았어요. 다시 시도해 주세요.");
  }
  if (!code || !returnedState || returnedState !== expectedState || !verifier) {
    throw new Error("로그인 응답을 확인할 수 없어요. 다시 시도해 주세요.");
  }

  const response = await fetch("/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      code,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) {
    throw new Error("로그인 정보를 확인하지 못했어요. 다시 시도해 주세요.");
  }

  const token = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!token.access_token || !token.expires_in) {
    throw new Error(
      "인증 서버 응답에 로그인 정보가 없어요. 다시 시도해 주세요.",
    );
  }

  sessionStorage.setItem(ACCESS_TOKEN_KEY, token.access_token);
  sessionStorage.setItem(
    TOKEN_EXPIRY_KEY,
    String(Date.now() + token.expires_in * 1000),
  );
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  // 인가 코드가 주소창과 새로고침 기록에 남지 않도록 홈 주소로 정리합니다.
  window.history.replaceState(null, "", "/");
}

/** 저장된 access token이 맛다공 가입 상태인지 인증 서버에서 확인합니다. */
async function getMembership(
  accessToken: string,
): Promise<MembershipStatus | "reauthenticate"> {
  const response = await fetch("/auth-api/api/v1/matdagong/membership", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 토큰이 거부되거나 DB가 초기화돼 SSO 세션만 남았다면 Kakao 인증부터 다시 받습니다.
  if (response.status === 401 || response.status === 404)
    return "reauthenticate";
  if (!response.ok)
    throw new Error(
      "맛다공 가입 상태를 확인하지 못했어요. 다시 로그인해 주세요.",
    );
  return (await response.json()) as MembershipStatus;
}

function showSignInError(message: string): void {
  const root = document.getElementById("root");
  if (!root) return;

  const panel = document.createElement("main");
  panel.className = "auth-start-screen auth-start-error";
  const title = document.createElement("h1");
  title.textContent = "로그인을 이어갈 수 없어요";
  const description = document.createElement("p");
  description.textContent = message;
  const retry = document.createElement("button");
  retry.type = "button";
  retry.textContent = "다시 로그인";
  retry.addEventListener("click", () => {
    window.location.assign("/");
  });
  panel.append(title, description, retry);
  root.replaceChildren(panel);
}

function showStartupStatus(message: string): void {
  const root = document.getElementById("root");
  if (!root) return;
  const panel = document.createElement("main");
  panel.className = "auth-start-screen";
  const status = document.createElement("p");
  status.textContent = message;
  panel.append(status);
  root.replaceChildren(panel);
}

async function startMatdagong(): Promise<void> {
  const root = document.getElementById("root");
  if (!root) return;

  // 과거에 사용하던 맛다공 /login 주소는 앱 진입 주소로 정리합니다.
  if (window.location.pathname === "/login") {
    window.history.replaceState(null, "", "/");
  }

  try {
    showStartupStatus(
      window.location.pathname === "/auth/callback"
        ? "로그인 결과를 확인하고 있어요…"
        : "맛다공에 접속하고 있어요…",
    );
    if (window.location.pathname === "/auth/callback") {
      await completeSignIn();
    }

    const expiresAt = Number(sessionStorage.getItem(TOKEN_EXPIRY_KEY));
    const accessToken = sessionStorage.getItem(ACCESS_TOKEN_KEY);
    if (!accessToken || expiresAt <= Date.now()) {
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
      await beginSignIn();
      return;
    }

    const membership = await getMembership(accessToken);
    if (membership === "reauthenticate") {
      await fetch("/auth-api/auth/session/clear", { method: "POST" });
      sessionStorage.removeItem(ACCESS_TOKEN_KEY);
      sessionStorage.removeItem(TOKEN_EXPIRY_KEY);
      await beginSignIn();
      return;
    }
    const reactRoot = createRoot(root);
    if (membership.registered) {
      reactRoot.render(
        <StrictMode>
          <App onLogout={() => void logout()} />
        </StrictMode>,
      );
    } else {
      reactRoot.render(
        <StrictMode>
          <SignupScreen
            accessToken={accessToken}
            displayName={membership.displayName}
            email={membership.email ?? ""}
            onComplete={() =>
              reactRoot.render(
                <StrictMode>
                  <App onLogout={() => void logout()} />
                </StrictMode>,
              )
            }
          />
        </StrictMode>,
      );
    }
  } catch (error) {
    sessionStorage.removeItem(STATE_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
    showSignInError(
      error instanceof Error ? error.message : "잠시 후 다시 시도해 주세요.",
    );
  }
}

// 맛다공은 먼저 홈 진입을 시도하고, 유효한 로그인 정보가 없으면 공통 인증을 시작합니다.
void startMatdagong();
