/**
 * 맛집 등록 화면에서 로그인이 만료됐을 때 작성 중이던 입력을 탭 저장소(sessionStorage)에 잠시 보관합니다.
 * 재로그인 뒤 등록 화면으로 돌아오면 한 번 복원하고 지웁니다.
 */

/**
 * 다른 화면이 등록 화면을 열면서 넘기는 일회성 장소 전달값의 sessionStorage 키입니다.
 * 등록 화면이 읽는 즉시 지우며, 이 값이 있으면 로그인 만료로 보관한 입력보다 우선합니다.
 */
export const LIKE_CONVERSION_HANDOFF_KEY = "matdagong.place-conversion.from-like";
export const QUICK_PLACE_HANDOFF_KEY = "matdagong.quick-place.selected-place";

const REGISTER_DRAFT_KEY = "matdagong.register.form-draft";
const REGISTER_DRAFT_VERSION = 1;
// 오래된 입력이 뒤늦게 나타나지 않도록 보관 시간을 제한합니다.
const REGISTER_DRAFT_TTL_MS = 6 * 60 * 60 * 1000;
// 재로그인에 필요한 state/verifier/토큰을 쓸 공간을 남겨 두지 못하면 사진 없이 저장합니다.
const STORAGE_HEADROOM_PROBE_KEY = "matdagong.register.form-draft.probe";
const STORAGE_HEADROOM_BYTES = 16 * 1024;

export type RegisterDraftMenu = { name: string; price: string; photo?: string };

export type RegisterDraftForm = {
  /** 수정 중인 맛집 ID입니다. 새 등록이면 null입니다. */
  editPlaceId: string | null;
  selectedPlace: KakaoPlaceResult | null;
  name: string;
  address: string;
  coordinates: { latitude: number; longitude: number } | null;
  reason: string;
  menus: RegisterDraftMenu[];
  tags: string[];
  visitConditions: string[];
  foodKind: "RESTAURANT" | "CAFE_DESSERT";
  visibility: "private" | "public";
  photos: string[];
  convertFromPlaceId: string | null;
  visitedConfirmed: boolean;
  conversionNeedsPlaceSearch: boolean;
  conversionSearchName: string;
  activeDraftId: string | null;
};

type StoredRegisterDraft = RegisterDraftForm & {
  version: number;
  accountId: string | null;
  savedAt: number;
  photosOmitted: boolean;
};

export type RestoredRegisterDraft = { form: RegisterDraftForm; photosOmitted: boolean };

export type RegisterDraftSaveResult = "saved" | "saved-without-photos" | "failed";

/** 사용자가 이번에 새로 고른 사진은 data URL이고, 이미 저장된 사진은 /media/... 주소입니다. */
export function isNewPhoto(source: string): boolean {
  return source.startsWith("data:");
}

/** 서명된 비공개 사진 주소(?exp=...&sig=...)도 같은 사진으로 비교할 수 있도록 경로만 남깁니다. */
export function mediaPath(source: string): string {
  return source.split(/[?#]/, 1)[0];
}

/**
 * 복원한 기존 사진 주소의 서명이 만료됐을 수 있으므로, 새로 받은 기록에 같은 사진이 있으면 그 주소로 바꿉니다.
 * 찾지 못한 주소는 그대로 둡니다. 서버는 쿼리 유무와 관계없이 기존 사진 참조로 받습니다.
 */
export function refreshMediaUrl(source: string, currentSources: readonly string[]): string {
  if (isNewPhoto(source)) return source;
  const path = mediaPath(source);
  return currentSources.find((candidate) => mediaPath(candidate) === path) ?? source;
}

export function clearRegisterDraft(): void {
  try {
    sessionStorage.removeItem(REGISTER_DRAFT_KEY);
  } catch {
    // 저장소를 쓸 수 없는 환경이면 지울 내용도 없습니다.
  }
}

function writeWithHeadroom(value: string): void {
  sessionStorage.setItem(REGISTER_DRAFT_KEY, value);
  try {
    sessionStorage.setItem(STORAGE_HEADROOM_PROBE_KEY, "x".repeat(STORAGE_HEADROOM_BYTES));
  } finally {
    try {
      sessionStorage.removeItem(STORAGE_HEADROOM_PROBE_KEY);
    } catch {
      // 확인용 값이 남지 않도록 최선을 다하고, 실패해도 저장 결과에는 영향을 주지 않습니다.
    }
  }
}

/** 입력 내용을 저장합니다. 사진 때문에 저장 공간이 부족하면 새 사진만 빼고 다시 저장합니다. */
export function saveRegisterDraft(form: RegisterDraftForm, accountId: string | null): RegisterDraftSaveResult {
  const stored: StoredRegisterDraft = {
    ...form,
    version: REGISTER_DRAFT_VERSION,
    accountId,
    savedAt: Date.now(),
    photosOmitted: false,
  };
  try {
    writeWithHeadroom(JSON.stringify(stored));
    return "saved";
  } catch {
    // QuotaExceededError 등으로 실패하면 큰 data URL 사진을 제외하고 다시 시도합니다.
  }

  const photos = form.photos.filter((photo) => !isNewPhoto(photo));
  const menus = form.menus.map((menu) => (menu.photo && isNewPhoto(menu.photo) ? { name: menu.name, price: menu.price } : menu));
  const photosOmitted = photos.length !== form.photos.length
    || menus.some((menu, index) => menu.photo !== form.menus[index]?.photo);
  try {
    clearRegisterDraft();
    writeWithHeadroom(JSON.stringify({ ...stored, photos, menus, photosOmitted }));
    return "saved-without-photos";
  } catch {
    clearRegisterDraft();
    return "failed";
  }
}

/** 복원할 사진은 이미지 data URL, 같은 출처의 상대 경로(/media/...), https 주소만 받습니다. */
function isRestorablePhoto(value: unknown): value is string {
  return typeof value === "string"
    && (value.startsWith("data:image/") || value.startsWith("https://")
      || (value.startsWith("/") && !value.startsWith("//")));
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value ? value : null;
}

function parseSelectedPlace(value: unknown): KakaoPlaceResult | null {
  if (!value || typeof value !== "object") return null;
  const place = value as Partial<Record<keyof KakaoPlaceResult, unknown>>;
  if (typeof place.id !== "string" || typeof place.place_name !== "string"
    || typeof place.x !== "string" || typeof place.y !== "string") return null;
  return {
    id: place.id,
    place_name: place.place_name,
    category_name: typeof place.category_name === "string" ? place.category_name : "",
    phone: typeof place.phone === "string" ? place.phone : "",
    address_name: typeof place.address_name === "string" ? place.address_name : "",
    road_address_name: typeof place.road_address_name === "string" ? place.road_address_name : "",
    x: place.x,
    y: place.y,
    place_url: typeof place.place_url === "string" ? place.place_url : "",
  };
}

/**
 * 같은 계정, 같은 등록/수정 대상의 저장된 입력이 있으면 돌려줍니다.
 * 다른 계정이거나 오래되거나 손상된 값은 지우고, 대상만 다르면 그대로 둡니다.
 */
export function readRegisterDraft(accountId: string | null, editPlaceId: string | null): RestoredRegisterDraft | null {
  let raw: string | null;
  try {
    raw = sessionStorage.getItem(REGISTER_DRAFT_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let value: Partial<StoredRegisterDraft>;
  try {
    value = JSON.parse(raw) as Partial<StoredRegisterDraft>;
  } catch {
    clearRegisterDraft();
    return null;
  }
  if (!value || typeof value !== "object" || value.version !== REGISTER_DRAFT_VERSION
    || typeof value.savedAt !== "number" || Date.now() - value.savedAt > REGISTER_DRAFT_TTL_MS
    || (value.accountId && accountId && value.accountId !== accountId)) {
    clearRegisterDraft();
    return null;
  }
  if ((value.editPlaceId ?? null) !== editPlaceId) return null;

  const coordinates = value.coordinates
    && Number.isFinite(value.coordinates.latitude) && Number.isFinite(value.coordinates.longitude)
    ? { latitude: value.coordinates.latitude, longitude: value.coordinates.longitude }
    : null;
  const menus = Array.isArray(value.menus)
    ? value.menus
      .filter((menu): menu is RegisterDraftMenu => !!menu && typeof menu === "object" && typeof menu.name === "string")
      .slice(0, 5)
      .map((menu) => ({
        name: menu.name,
        price: typeof menu.price === "string" ? menu.price : "",
        ...(isRestorablePhoto(menu.photo) ? { photo: menu.photo } : {}),
      }))
    : [];

  return {
    photosOmitted: value.photosOmitted === true,
    form: {
      editPlaceId,
      selectedPlace: parseSelectedPlace(value.selectedPlace),
      name: typeof value.name === "string" ? value.name : "",
      address: typeof value.address === "string" ? value.address : "",
      coordinates,
      reason: typeof value.reason === "string" ? value.reason : "",
      menus: menus.length ? menus : [{ name: "", price: "" }],
      tags: stringList(value.tags),
      visitConditions: stringList(value.visitConditions),
      foodKind: value.foodKind === "CAFE_DESSERT" ? "CAFE_DESSERT" : "RESTAURANT",
      visibility: value.visibility === "public" ? "public" : "private",
      photos: (Array.isArray(value.photos) ? value.photos.filter(isRestorablePhoto) : []).slice(0, 10),
      convertFromPlaceId: stringOrNull(value.convertFromPlaceId),
      visitedConfirmed: value.visitedConfirmed === true,
      conversionNeedsPlaceSearch: value.conversionNeedsPlaceSearch === true,
      conversionSearchName: typeof value.conversionSearchName === "string" ? value.conversionSearchName : "",
      activeDraftId: stringOrNull(value.activeDraftId),
    },
  };
}
