/** 맛다공 API 요청의 인증 헤더, JSON 처리, 오류 메시지, 로그인 만료 처리를 한곳에서 맞춥니다. */

export const ACCESS_TOKEN_KEY = "matdagong.auth.access-token";
export const TOKEN_EXPIRY_KEY = "matdagong.auth.expires-at";
/** 로그인 만료 직전에 화면이 입력 내용을 보관할 수 있도록 알리는 window 이벤트입니다. */
export const SESSION_EXPIRING_EVENT = "matdagong:session-expiring";

// 요청이 서버에 닿는 사이에 만료되지 않도록 만료 직전의 토큰은 이미 만료된 것으로 봅니다.
const EXPIRY_SKEW_MS = 10_000;
const SESSION_EXPIRED_MESSAGE = "로그인 시간이 지나 다시 로그인하고 있어요.";
const NETWORK_ERROR_MESSAGE = "서버에 연결하지 못했어요. 네트워크 상태를 확인해 주세요.";

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

/** 토큰이 만료됐거나 서버가 401로 거부해 다시 로그인해야 하는 경우입니다. */
export class SessionExpiredError extends ApiError {
  constructor() {
    super(401, SESSION_EXPIRED_MESSAGE);
    this.name = "SessionExpiredError";
  }
}

export function isSessionExpiredError(error: unknown): error is SessionExpiredError {
  return error instanceof SessionExpiredError;
}

let sessionExpiredHandler: (() => void) | null = null;
let sessionExpiring = false;

/** main.tsx가 로그인 만료 시 실행할 단일 처리기를 등록합니다. 나중에 등록한 처리기가 이전 것을 대신합니다. */
export function setSessionExpiredHandler(handler: () => void): void {
  sessionExpiredHandler = handler;
}

/** 이미 재로그인을 시작했다면 화면은 새 오류 안내를 띄우지 않아도 됩니다. */
export function isSessionExpiring(): boolean {
  return sessionExpiring;
}

/** 로그인 만료 직전 알림을 구독합니다. 반환한 함수로 구독을 해제합니다. */
export function onSessionExpiring(listener: () => void): () => void {
  window.addEventListener(SESSION_EXPIRING_EVENT, listener);
  return () => window.removeEventListener(SESSION_EXPIRING_EVENT, listener);
}

function readStorage(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function removeStorage(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // 저장소를 쓸 수 없는 환경에서도 재로그인은 이어갑니다.
  }
}

/** main.tsx가 로그인 직후 저장한 만료 시각을 기준으로 현재 토큰을 더 쓸 수 있는지 확인합니다. */
export function isStoredTokenExpired(now = Date.now()): boolean {
  const token = readStorage(ACCESS_TOKEN_KEY);
  const expiresAt = Number(readStorage(TOKEN_EXPIRY_KEY));
  if (!token || !Number.isFinite(expiresAt) || expiresAt <= 0) return true;
  return expiresAt - EXPIRY_SKEW_MS <= now;
}

/** 여러 요청이 동시에 401을 받아도 재로그인은 한 번만 시작합니다. */
export function notifySessionExpired(): void {
  if (sessionExpiring) return;
  sessionExpiring = true;
  removeStorage(ACCESS_TOKEN_KEY);
  removeStorage(TOKEN_EXPIRY_KEY);
  if (sessionExpiredHandler) {
    sessionExpiredHandler();
    return;
  }
  // 처리기가 아직 없다면 현재 주소 그대로 다시 열어 앱 시작 단계의 로그인을 거칩니다.
  window.location.reload();
}

async function responseError(response: Response, fallback: string): Promise<ApiError> {
  let detail = "";
  try {
    const body = await response.text();
    const problem = JSON.parse(body) as { detail?: unknown; message?: unknown } | null;
    const candidate = problem?.detail ?? problem?.message;
    if (typeof candidate === "string") detail = candidate.trim();
  } catch {
    // 프록시나 서버가 JSON이 아닌 오류 페이지를 반환해도 상태 코드는 알려줍니다.
  }
  return new ApiError(response.status, detail || `${fallback} (오류 ${response.status})`);
}

export type ApiRequestOptions = RequestInit & {
  /** 서버가 ProblemDetail의 detail/message를 주지 않았을 때 보여줄 안내입니다. */
  errorMessage?: string;
};

/**
 * 맛다공 API를 호출합니다.
 * - 저장된 토큰이 이미 만료됐다면 요청을 보내지 않고 401과 같이 처리합니다.
 * - 401은 등록된 로그인 만료 처리기를 한 번만 실행하고 SessionExpiredError를 던집니다.
 * - 204나 빈 응답은 undefined로 돌려줍니다.
 */
export async function apiRequest<T>(
  url: string,
  accessToken: string,
  { errorMessage = "요청을 처리하지 못했어요.", ...init }: ApiRequestOptions = {},
): Promise<T> {
  if (sessionExpiring || isStoredTokenExpired()) {
    notifySessionExpired();
    throw new SessionExpiredError();
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${accessToken}`);
  // FormData 업로드는 브라우저가 boundary를 붙이도록 Content-Type을 비워 둡니다.
  if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (cause) {
    // 화면 이동으로 취소한 요청은 호출한 쪽이 구분할 수 있도록 그대로 전달합니다.
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    throw new ApiError(0, NETWORK_ERROR_MESSAGE);
  }

  if (response.status === 401) {
    notifySessionExpired();
    throw new SessionExpiredError();
  }
  if (!response.ok) throw await responseError(response, errorMessage);
  if (response.status === 204) return undefined as T;

  const body = await response.text();
  if (!body) return undefined as T;
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new ApiError(response.status, `${errorMessage} (응답 형식 오류)`);
  }
}
