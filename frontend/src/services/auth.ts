/**
 * 공통 인증 서버(dagong-auth)와 주고받는 요청입니다. 토큰 교환, 맛다공 가입 상태 조회·가입, 로그인 정보 정리를 맡습니다.
 * 가입 상태 조회는 401을 "다시 인증"으로 다뤄야 하므로 apiRequest(401이면 재로그인 시작) 대신 fetch를 씁니다.
 */
import { STORAGE_KEYS, readStorage, removeStorage, writeStorage } from "../utils/storage";
import { apiRequest } from "./http";

const AUTH_API_BASE_URL = "/auth-api";
const TOKEN_ENDPOINT = "/oauth2/token";

export type MembershipStatus = {
  registered: boolean;
  displayName: string;
  email: string | null;
};

/** 인가 코드를 access token으로 바꿉니다. 받은 토큰은 탭 저장소에 보관합니다. */
export async function exchangeAuthorizationCode({
  clientId,
  redirectUri,
  code,
  verifier,
}: {
  clientId: string;
  redirectUri: string;
  code: string;
  verifier: string;
}): Promise<void> {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: verifier,
    }),
  });
  if (!response.ok) {
    throw new Error("로그인 정보를 확인하지 못했어요. 다시 시도해 주세요.");
  }
  const token: unknown = await response.json();
  const accessToken = token && typeof token === "object" && "access_token" in token ? token.access_token : undefined;
  const expiresIn = token && typeof token === "object" && "expires_in" in token ? token.expires_in : undefined;
  if (typeof accessToken !== "string" || !accessToken || typeof expiresIn !== "number" || !expiresIn) {
    throw new Error("인증 서버 응답에 로그인 정보가 없어요. 다시 시도해 주세요.");
  }
  // 저장하지 못한 채 넘어가면 로그인이 끝없이 다시 시작되므로 여기서 멈춥니다.
  if (
    !writeStorage(STORAGE_KEYS.accessToken, accessToken, "session") ||
    !writeStorage(STORAGE_KEYS.tokenExpiry, String(Date.now() + expiresIn * 1000), "session")
  ) {
    throw new Error("로그인 정보를 저장하지 못했어요. 브라우저의 사이트 데이터 설정을 확인해 주세요.");
  }
}

/** 탭에 보관한 access token입니다. 없거나 만료됐으면 null입니다. */
export function readStoredAccessToken(): string | null {
  const accessToken = readStorage(STORAGE_KEYS.accessToken, "session");
  const expiresAt = Number(readStorage(STORAGE_KEYS.tokenExpiry, "session"));
  return accessToken && expiresAt > Date.now() ? accessToken : null;
}

export function clearStoredAccessToken(): void {
  removeStorage(STORAGE_KEYS.accessToken, "session");
  removeStorage(STORAGE_KEYS.tokenExpiry, "session");
}

/** 저장된 access token이 맛다공 가입 상태인지 인증 서버에서 확인합니다. */
export async function getMembership(accessToken: string): Promise<MembershipStatus | "reauthenticate"> {
  const response = await fetch(`${AUTH_API_BASE_URL}/api/v1/matdagong/membership`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 토큰이 거부되거나 DB가 초기화돼 SSO 세션만 남았다면 Kakao 인증부터 다시 받습니다.
  if (response.status === 401 || response.status === 404) return "reauthenticate";
  const membership: unknown = response.ok ? await response.json() : null;
  if (!isMembershipStatus(membership)) {
    throw new Error("맛다공 가입 상태를 확인하지 못했어요. 다시 로그인해 주세요.");
  }
  return membership;
}

function isMembershipStatus(value: unknown): value is MembershipStatus {
  return (
    !!value &&
    typeof value === "object" &&
    "registered" in value &&
    typeof value.registered === "boolean" &&
    "displayName" in value &&
    typeof value.displayName === "string"
  );
}

/** 맛다공 가입을 마칩니다. 가입 화면이 씁니다. */
export function registerMembership(
  accessToken: string,
  { displayName, email }: { displayName: string; email: string | null },
): Promise<void> {
  return apiRequest<void>(`${AUTH_API_BASE_URL}/api/v1/matdagong/membership`, accessToken, {
    method: "POST",
    body: JSON.stringify({ displayName, email }),
    errorMessage: "가입을 완료하지 못했어요. 다시 시도해 주세요.",
  });
}

/** 공통 서버의 로그인 세션을 끊습니다. 서버에 닿지 못해도 호출한 쪽은 로그인을 다시 시작할 수 있도록 실패를 던지지 않습니다. */
export async function clearServerSession(): Promise<void> {
  try {
    await fetch(`${AUTH_API_BASE_URL}/auth/session/clear`, { method: "POST" });
  } catch {
    // 서버에 닿지 못해도 현재 탭의 인증 정보는 지우고 로그인을 다시 시작합니다.
  }
}
