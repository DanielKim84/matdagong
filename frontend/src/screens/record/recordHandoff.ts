import { readStorage, readStorageJson, removeStorage, STORAGE_KEYS } from "../../utils/storage";

/**
 * 다른 화면(하트 전환·맛집 상세·빠른 기록)이 기록하기를 열면서 탭 저장소에 넘기는 일회성 장소 값입니다.
 * 읽는 즉시 지우며, 이 값이 있으면 로그인 만료로 보관한 입력보다 우선합니다.
 */

type LikeConversionHandoff =
  | { sourcePlaceId: string; place: KakaoPlaceResult }
  | { sourcePlaceId: string; searchName: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object";
}

/** 지도에서 고를 수 있는 카카오 장소인지(ID·이름·좌표가 있는지) 확인합니다. */
function isKakaoPlace(value: unknown): value is KakaoPlaceResult {
  return isRecord(value) && !!value.id && !!value.place_name && !!value.x && !!value.y;
}

/** 맛집 상세의 '내 기록 남기기'가 넘기는 가게입니다. 방문 근거는 상세 화면이 넘기기 전에 확인합니다. */
type PlaceDetailHandoff = { place: KakaoPlaceResult };

export function hasPlaceHandoff(): boolean {
  return (
    !!readStorage(STORAGE_KEYS.likeConversionHandoff, "session") ||
    !!readStorage(STORAGE_KEYS.quickPlaceHandoff, "session") ||
    !!readStorage(STORAGE_KEYS.placeDetailHandoff, "session")
  );
}

/** 맛집 상세에서 넘긴 가게를 꺼냅니다. 손상된 값은 지우고 null입니다. */
export function takePlaceDetailHandoff(): PlaceDetailHandoff | null {
  const value = readStorageJson(STORAGE_KEYS.placeDetailHandoff, "session");
  removeStorage(STORAGE_KEYS.placeDetailHandoff, "session");
  if (!isRecord(value) || !isKakaoPlace(value.place)) return null;
  return { place: value.place };
}

/** 하트로 저장한 장소를 방문 기록으로 바꾸는 요청을 꺼냅니다. 잘못된 값은 지우고 null입니다. */
export function takeLikeConversionHandoff(): LikeConversionHandoff | null {
  const value = readStorageJson(STORAGE_KEYS.likeConversionHandoff, "session");
  removeStorage(STORAGE_KEYS.likeConversionHandoff, "session");
  if (!isRecord(value) || !value.sourcePlaceId || typeof value.sourcePlaceId !== "string") return null;
  if (isKakaoPlace(value.place)) return { sourcePlaceId: value.sourcePlaceId, place: value.place };
  if (value.searchName && typeof value.searchName === "string") {
    return { sourcePlaceId: value.sourcePlaceId, searchName: value.searchName };
  }
  return null;
}

/** 빠른 기록에서 고른 장소를 꺼냅니다. 손상된 값은 지우고 null입니다. */
export function takeQuickPlaceHandoff(): KakaoPlaceResult | null {
  const value = readStorageJson(STORAGE_KEYS.quickPlaceHandoff, "session");
  removeStorage(STORAGE_KEYS.quickPlaceHandoff, "session");
  return isKakaoPlace(value) ? value : null;
}

/**
 * 이전 버전이 이 브라우저(localStorage)에만 저장한 빠른 기록의 장소들입니다.
 * 없거나 읽을 수 없으면 null(다음 진입 때 다시 시도), 목록 모양이 아니면 옮길 것이 없으므로 빈 배열입니다.
 */
export function readLegacyQuickDraftPlaces(): KakaoPlaceResult[] | null {
  const value = readStorageJson(STORAGE_KEYS.legacyQuickDrafts, "local");
  if (value === null) return null;
  if (!Array.isArray(value)) return [];
  return value.flatMap((item: unknown) => (isRecord(item) && "place" in item ? [item.place as KakaoPlaceResult] : []));
}

export function removeLegacyQuickDrafts(): void {
  removeStorage(STORAGE_KEYS.legacyQuickDrafts, "local");
}
