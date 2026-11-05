/**
 * 브라우저 저장소(sessionStorage·localStorage)의 키와 안전한 읽기·쓰기입니다.
 * 사생활 보호 모드·저장 공간 부족·차단된 사이트 데이터에서는 저장소 접근 자체가 예외를 던지므로,
 * 화면은 저장소를 직접 부르지 않고 이 함수를 씁니다. 실패하면 읽기는 null, 쓰기는 false입니다.
 */

/**
 * 앱 전체 저장소 키입니다. 새 키는 `matdagong.<영역>.<이름>` 형식으로 만듭니다.
 * 이미 쓰고 있는 키 문자열은 저장된 데이터를 계속 읽을 수 있도록 바꾸지 않습니다.
 */
export const STORAGE_KEYS = {
  /** session: 로그인 토큰과 만료 시각(ms) */
  accessToken: "matdagong.auth.access-token",
  tokenExpiry: "matdagong.auth.expires-at",
  /** session: 로그인(PKCE) 진행 중 값과 로그인 뒤 돌아갈 주소 */
  oauthState: "matdagong.auth.oauth-state",
  pkceVerifier: "matdagong.auth.pkce-verifier",
  returnHash: "matdagong.auth.return-hash",
  /** local: 첫 소개·가입을 마쳤는지. 계정별 키는 onboardingCompletedKey()를 씁니다. */
  onboardingCompleted: "matdagong.onboarding.completed",
  /** session: 다른 화면이 기록 화면을 열면서 넘기는 일회성 장소 값 */
  likeConversionHandoff: "matdagong.place-conversion.from-like",
  quickPlaceHandoff: "matdagong.quick-place.selected-place",
  placeDetailHandoff: "matdagong.place-detail.record-place",
  /** session: 로그인 만료 때 보관한 기록 입력과 남은 공간 확인용 값 */
  registerDraft: "matdagong.register.form-draft",
  registerDraftProbe: "matdagong.register.form-draft.probe",
  /** session: 테마 미리 보기(?theme=) */
  themePreview: "matdagong.theme.preview",
  /** session: 발견 화면의 조건·시트 높이·정렬 */
  discoverState: "matdagong.discover.state",
  /** local: 맛객별로 마지막으로 본 스토리 기록 시각 */
  feedStorySeen: "matdagong.feed.storySeen",
  /** local(이전 버전): 브라우저에만 남긴 빠른 기록. 계정 임시 목록으로 옮긴 뒤 지웁니다. */
  legacyQuickDrafts: "matdagong.place-quick-drafts.v1",
  /** local(이전 버전): 장소 등록·하트·최근 본 장소. 앞의 키가 최신 형식입니다. */
  legacyActivity: ["matdagong-activity-v4", "matdagong-activity-v3", "matdagong-activity-v2"],
} as const;

/** local: 계정별 첫 소개·가입 완료 표시 */
export function onboardingCompletedKey(accountId?: string | null): string {
  return accountId ? `${STORAGE_KEYS.onboardingCompleted}:${accountId}` : STORAGE_KEYS.onboardingCompleted;
}

/** local: 이전 브라우저 기록(최근 본 장소)을 계정별로 서버에 옮겼는지 */
export function recentMigrationKey(accountId: string): string {
  return `matdagong-recent-db-sync-v1:${accountId}`;
}

/** local: 이전 브라우저 기록(등록·하트)을 계정별로 서버에 옮겼는지 */
export function placeMigrationKey(accountId: string): string {
  return `matdagong-place-server-sync-v1:${accountId}`;
}

/** session은 탭을 닫으면 지워지는 값, local은 브라우저에 남는 값입니다. */
type StorageArea = "session" | "local";

function storageOf(area: StorageArea): Storage {
  return area === "session" ? window.sessionStorage : window.localStorage;
}

export function readStorage(key: string, area: StorageArea): string | null {
  try {
    return storageOf(area).getItem(key);
  } catch {
    return null;
  }
}

/** 저장했으면 true, 저장소를 쓸 수 없거나 공간이 부족하면 false입니다. */
export function writeStorage(key: string, value: string, area: StorageArea): boolean {
  try {
    storageOf(area).setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string, area: StorageArea): void {
  try {
    storageOf(area).removeItem(key);
  } catch {
    // 저장소를 쓸 수 없어도 화면 동작은 이어갑니다.
  }
}

/** JSON으로 저장한 값을 읽습니다. 없거나 깨진 값은 null입니다. 결과는 unknown이므로 쓰는 쪽에서 모양을 확인합니다. */
export function readStorageJson(key: string, area: StorageArea): unknown {
  const raw = readStorage(key, area);
  if (raw === null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeStorageJson(key: string, value: unknown, area: StorageArea): boolean {
  let raw: string;
  try {
    raw = JSON.stringify(value);
  } catch {
    return false;
  }
  return writeStorage(key, raw, area);
}

/** 저장했던 값에서 문자열 항목만 골라 목록으로 돌려줍니다. 배열이 아니면 빈 목록입니다. */
export function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
