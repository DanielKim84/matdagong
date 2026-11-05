/**
 * 공통 인증(OAuth 2 + PKCE) 로그인 시작·완료와 로그인 뒤 돌아갈 화면 기억을 맡습니다.
 * PKCE verifier는 브라우저 탭(sessionStorage)에만 보관하고, 공개 클라이언트에는 secret을 두지 않습니다.
 */
import { clearServerSession, clearStoredAccessToken, exchangeAuthorizationCode } from "../services/auth";
import { clearRegisterDraft } from "../services/registerDraft";
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from "../utils/storage";
import { resetRouteHistory } from "./navigation";

const AUTHORIZATION_SERVER = import.meta.env.VITE_AUTH_SERVER_URL ?? "http://localhost:5840";
const CLIENT_ID = import.meta.env.VITE_AUTH_CLIENT_ID ?? "matdagong-web-dev";
const REDIRECT_URI = import.meta.env.VITE_AUTH_REDIRECT_URI ?? `${window.location.origin}/auth/callback`;
// 로그인 뒤 돌아갈 주소는 앱 내부 해시 경로(#화면 또는 #화면/ID)만 허용해 외부 주소로 이동하지 않게 합니다.
const SAFE_RETURN_HASH = /^#[a-z-]+(\/[A-Za-z0-9_-]+)?$/;

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomBase64Url(byteLength: number): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

/** 로그인 진행 중 값(state, verifier)을 지웁니다. */
export function clearPendingSignIn(): void {
  removeStorage(STORAGE_KEYS.oauthState, "session");
  removeStorage(STORAGE_KEYS.pkceVerifier, "session");
}

/** 로그인으로 떠나기 전 현재 화면의 해시 경로를 기억합니다. 허용 형식이 아니면 이전 값도 지웁니다. */
export function rememberReturnHash(): void {
  const hash = window.location.hash;
  // 저장소를 쓸 수 없으면 로그인 뒤 홈으로 돌아갑니다.
  if (SAFE_RETURN_HASH.test(hash)) writeStorage(STORAGE_KEYS.returnHash, hash, "session");
  else removeStorage(STORAGE_KEYS.returnHash, "session");
}

/** 기억한 해시 경로를 다시 검증해 돌려줍니다. 형식이 맞지 않으면 빈 문자열(홈)입니다. */
export function readReturnHash(): string {
  const hash = readStorage(STORAGE_KEYS.returnHash, "session") ?? "";
  return SAFE_RETURN_HASH.test(hash) ? hash : "";
}

function takeReturnHash(): string {
  const hash = readReturnHash();
  // 지우지 못해도 다음 로그인 시작 때 현재 화면 기준으로 다시 덮어씁니다.
  removeStorage(STORAGE_KEYS.returnHash, "session");
  return hash;
}

export async function beginSignIn(): Promise<void> {
  const verifier = randomBase64Url(32);
  const state = randomBase64Url(32);
  const challenge = base64Url(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))),
  );
  // 콜백에서 state·verifier를 확인해야 하므로 저장하지 못하면 인증 서버로 떠나지 않습니다.
  if (
    !writeStorage(STORAGE_KEYS.oauthState, state, "session") ||
    !writeStorage(STORAGE_KEYS.pkceVerifier, verifier, "session")
  ) {
    throw new Error("로그인 정보를 저장하지 못했어요. 브라우저의 사이트 데이터 설정을 확인해 주세요.");
  }

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

/** 인증 서버 콜백(/auth/callback)의 인가 코드를 토큰으로 바꾸고, 로그인 전에 보던 화면 주소로 돌아갑니다. */
export async function completeSignIn(): Promise<void> {
  const callback = new URL(window.location.href);
  const code = callback.searchParams.get("code");
  const returnedState = callback.searchParams.get("state");
  const expectedState = readStorage(STORAGE_KEYS.oauthState, "session");
  const verifier = readStorage(STORAGE_KEYS.pkceVerifier, "session");

  if (callback.searchParams.has("error")) {
    throw new Error("공통 계정 인증이 완료되지 않았어요. 다시 시도해 주세요.");
  }
  if (!code || !returnedState || returnedState !== expectedState || !verifier) {
    throw new Error("로그인 응답을 확인할 수 없어요. 다시 시도해 주세요.");
  }

  await exchangeAuthorizationCode({ clientId: CLIENT_ID, redirectUri: REDIRECT_URI, code, verifier });
  clearPendingSignIn();
  // 인가 코드가 주소창과 새로고침 기록에 남지 않도록 정리합니다.
  window.history.replaceState(null, "", `/${takeReturnHash()}`);
  resetRouteHistory();
}

/** 저장된 로그인 정보와 공통 서버 세션을 지우고 지금 화면으로 돌아오도록 로그인을 다시 시작합니다. */
export async function restartSignIn(): Promise<void> {
  await clearServerSession();
  clearStoredAccessToken();
  rememberReturnHash();
  await beginSignIn();
}

/** 맛다공 인증 정보를 지우고 공통 인증을 다시 시작해 로그인 뒤 앱으로 돌아오게 합니다. */
export async function logout(): Promise<void> {
  // 공통 서버 세션과 이 기기의 맛다공 로그인 기록을 끊어, 다음 방문에서 이전 SSO 세션이 재사용되지 않고
  // 다른 기기에서 로그인할 때 이 기기를 로그아웃할지 묻지 않게 합니다.
  await clearServerSession({ endDeviceLogin: true });
  clearStoredAccessToken();
  clearPendingSignIn();
  // 로그아웃은 다른 계정으로 다시 들어올 수 있으므로 돌아갈 화면과 작성 중 입력을 남기지 않습니다.
  removeStorage(STORAGE_KEYS.returnHash, "session");
  clearRegisterDraft();
  // 로그인 페이지만 열면 인증 완료 후 돌아올 앱이 없어지므로 OAuth 흐름을 다시 시작합니다.
  await beginSignIn();
}
