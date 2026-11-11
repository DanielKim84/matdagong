import { isKakaoPlace, isRecord, readStorage, readStorageJson, removeStorage, STORAGE_KEYS } from "../../utils/storage";

/**
 * 다른 화면(맛집 상세·빠른 기록)이 기록하기를 열면서 탭 저장소에 넘기는 일회성 장소 값입니다.
 * 읽는 즉시 지우며, 이 값이 있으면 로그인 만료로 보관한 입력보다 우선합니다.
 */

/** 맛집 상세의 '내 기록 남기기'가 넘기는 가게입니다. 방문 근거는 상세 화면이 넘기기 전에 확인합니다. */
type PlaceDetailHandoff = { place: KakaoPlaceResult };

export function hasPlaceHandoff(): boolean {
  return (
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

/** 빠른 기록에서 고른 장소를 꺼냅니다. 손상된 값은 지우고 null입니다. */
export function takeQuickPlaceHandoff(): KakaoPlaceResult | null {
  const value = readStorageJson(STORAGE_KEYS.quickPlaceHandoff, "session");
  removeStorage(STORAGE_KEYS.quickPlaceHandoff, "session");
  return isKakaoPlace(value) ? value : null;
}
