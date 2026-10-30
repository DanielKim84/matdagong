import type { NewPlace, Place } from "../models/place";
import { apiRequest, type ApiRequestOptions } from "./http";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

/** 빠른 장소 기록처럼 마이 화면 숫자가 바뀌는 저장을 마친 뒤 window에 알리는 이벤트입니다. */
export const MY_ACTIVITY_CHANGED_EVENT = "matdagong:my-activity-changed";

export type QuickPlaceDraft = {
  providerCode: string; providerPlaceId: string; placeName: string; category: string | null; address: string;
  latitude: number; longitude: number; providerPhone: string | null; providerUrl: string | null;
  roadAddress: string | null; lotAddress: string | null; savedAt: string;
};
export type QuickPlaceDuplicate = { alreadyRegistered: boolean; alreadySaved: boolean; placeName: string | null };

/** 빠른 장소 기록을 등록 화면이 쓰는 카카오 검색 결과 형식으로 바꿉니다. */
export function kakaoPlaceFromQuickDraft(draft: QuickPlaceDraft): KakaoPlaceResult {
  return {
    id: draft.providerPlaceId,
    place_name: draft.placeName,
    category_name: draft.category ?? "",
    phone: draft.providerPhone ?? "",
    address_name: draft.lotAddress ?? draft.address,
    road_address_name: draft.roadAddress ?? draft.address,
    x: String(draft.longitude),
    y: String(draft.latitude),
    place_url: draft.providerUrl ?? "",
  };
}

/** 카카오 장소 ID가 있는 맛집을 등록 화면의 선택 장소 형식으로 바꿉니다. 장소 ID가 없으면 null입니다. */
export function kakaoPlaceFromPlace(place: Place): KakaoPlaceResult | null {
  if (!place.providerPlaceId) return null;
  return {
    id: place.providerPlaceId,
    place_name: place.name,
    category_name: place.category,
    phone: place.providerPhone ?? "",
    address_name: place.lotAddress ?? place.address,
    road_address_name: place.roadAddress ?? place.address,
    x: String(place.longitude),
    y: String(place.latitude),
    place_url: place.providerUrl ?? "",
  };
}

// 검색어가 바뀌면 이전 요청을 취소해 늦게 도착한 응답이 최신 결과를 덮지 않게 합니다.
export function getPlaces(
  search: string,
  accessToken: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  return request(search ? `?q=${encodeURIComponent(search)}` : "", accessToken, {
    signal,
    errorMessage: "맛집을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  });
}

export function getPlace(id: string, accessToken: string): Promise<Place> {
  return request(`/${encodeURIComponent(id)}`, accessToken, { errorMessage: "맛집 정보를 불러오지 못했어요." });
}

/** 장소 API도 공통 요청 도구를 거쳐 로그인 만료와 오류 메시지를 다른 화면과 같게 처리합니다. */
function request<T>(path: string, accessToken: string, init: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(`${baseUrl}/v1/places${path}`, accessToken, {
    errorMessage: "맛집 정보를 처리하지 못했어요.",
    ...init,
  });
}

export function getMyPlaceRecords(accessToken: string): Promise<Place[]> {
  return request("/records/mine", accessToken);
}

export function getRecentPlaces(accessToken: string): Promise<Place[]> {
  return request("/recent", accessToken);
}

export function rememberRecentPlace(accessToken: string, placeId: string): Promise<void> {
  return request("/recent", accessToken, { method: "POST", body: JSON.stringify({ placeId }) });
}

export function getQuickPlaceDrafts(accessToken: string): Promise<QuickPlaceDraft[]> {
  return request("/drafts", accessToken);
}

export function checkQuickPlaceDuplicate(accessToken: string, place: KakaoPlaceResult): Promise<QuickPlaceDuplicate> {
  const params = new URLSearchParams({ providerCode: "KAKAO", providerPlaceId: place.id });
  return request(`/drafts/check?${params.toString()}`, accessToken);
}

export function saveQuickPlaceDraft(accessToken: string, place: KakaoPlaceResult): Promise<QuickPlaceDraft> {
  return request("/drafts", accessToken, { method: "POST", body: JSON.stringify({
    providerCode: "KAKAO", providerPlaceId: place.id, placeName: place.place_name, category: place.category_name,
    address: place.road_address_name || place.address_name,
    roadAddress: place.road_address_name || null, lotAddress: place.address_name || null,
    latitude: Number(place.y), longitude: Number(place.x),
    providerPhone: place.phone || null, providerUrl: place.place_url || null,
  }) });
}

export function deleteQuickPlaceDraft(accessToken: string, providerPlaceId: string, providerCode = "KAKAO"): Promise<void> {
  return request(`/drafts/${encodeURIComponent(providerPlaceId)}?providerCode=${encodeURIComponent(providerCode)}`, accessToken, { method: "DELETE" });
}

/** 새 기록 등록과 하트→기록 전환이 같은 기록 본문(CreatePlaceRecordRequest)을 보내도록 화면 입력을 바꿉니다. */
function placeRecordBody(place: NewPlace) {
  return {
    providerCode: place.providerCode ?? "KAKAO",
    providerPlaceId: place.providerPlaceId,
    placeName: place.name,
    category: place.category ?? "음식점",
    address: place.address,
    roadAddress: place.roadAddress ?? null,
    lotAddress: place.lotAddress ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    providerPhone: place.providerPhone ?? null,
    providerUrl: place.providerUrl ?? null,
    reason: place.reason,
    visibility: place.visibility === "public" ? "PUBLIC" : "PRIVATE",
    menus: place.menus,
    tags: place.tags,
    tagGroups: place.tagGroups ?? {},
    visitConditions: place.visitConditions,
    photos: place.photos,
  };
}

export function createPlaceRecord(accessToken: string, place: NewPlace): Promise<Place> {
  return request("/records", accessToken, {
    method: "POST",
    body: JSON.stringify(placeRecordBody(place)),
  });
}

export function convertLikedPlaceToRecord(accessToken: string, sourcePlaceId: string, place: NewPlace): Promise<Place> {
  return request("/records/from-like", accessToken, {
    method: "POST",
    body: JSON.stringify({ sourcePlaceId, visitedConfirmed: true, record: placeRecordBody(place) }),
  });
}

export function convertPlaceRecordToLike(accessToken: string, placeId: string): Promise<void> {
  return request(`/records/${encodeURIComponent(placeId)}/to-like`, accessToken, { method: "POST" });
}

export function getLikedPlaceIds(accessToken: string): Promise<string[]> {
  return request("/likes", accessToken);
}

/** 기록에서 하트로 옮긴 내 방문 장소만 다시 기록 전환할 수 있습니다. */
export function getVisitedLikedPlaceIds(accessToken: string): Promise<string[]> {
  return request("/likes/visited", accessToken);
}

export function setPlaceLiked(accessToken: string, placeId: string, liked: boolean): Promise<void> {
  return request(`/${encodeURIComponent(placeId)}/like`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ liked }),
  });
}
