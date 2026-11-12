/** 장소 서비스(맛집 목록·내 기록·빠른 저장·하트·다녀온 곳·별로였던 곳) API 요청입니다. */
import { KAKAO_PROVIDER_CODE, type NewPlace, type Place, type Taster } from "../models/place";
import { kakaoPlaceAddress, kakaoPlaceCoordinates, type Coordinates } from "../utils/geo";
import { API_BASE_URL, apiRequest, type ApiRequestOptions } from "./http";

/** 빠른 장소 기록처럼 마이 화면 숫자가 바뀌는 저장을 마친 뒤 window에 알리는 이벤트입니다. */
export const MY_ACTIVITY_CHANGED_EVENT = "matdagong:my-activity-changed";

export type QuickPlaceDraft = {
  providerCode: string;
  providerPlaceId: string;
  placeName: string;
  category: string | null;
  address: string;
  latitude: number;
  longitude: number;
  providerPhone: string | null;
  providerUrl: string | null;
  roadAddress: string | null;
  lotAddress: string | null;
  savedAt: string;
};
type QuickPlaceDuplicate = { alreadyRegistered: boolean; alreadySaved: boolean; placeName: string | null };

/** 기록 응답(서버 TasterRecordView)입니다. 작성자 사진·캐릭터와 커뮤니티 프로필 값은 담겨 있지 않습니다. */
type TasterRecordResponse = Pick<
  Taster,
  "tasterId" | "tasterName" | "note" | "menus" | "photos" | "tags" | "tagGroups" | "visitConditions" | "visibility"
> & { recordedAt: string };
/** 장소 응답(서버 PlaceView)입니다. */
type PlaceResponse = Omit<Place, "tasters"> & { tasters: TasterRecordResponse[] };

/**
 * 장소 응답을 화면용 장소로 바꿉니다. 작성자 사진은 빈 값·1번 캐릭터로 두고 app/enrichPlaces가 커뮤니티 프로필로 채웁니다.
 * 프로필을 찾지 못한 맛객은 이 기본값 그대로 기본 캐릭터로 보입니다.
 */
function toPlace(response: PlaceResponse): Place {
  return { ...response, tasters: response.tasters.map((record) => ({ ...record, avatar: "", avatarVariant: 1 })) };
}

async function requestPlace(path: string, accessToken: string, init?: ApiRequestOptions): Promise<Place> {
  return toPlace(await request<PlaceResponse>(path, accessToken, init));
}

async function requestPlaces(path: string, accessToken: string, init?: ApiRequestOptions): Promise<Place[]> {
  return (await request<PlaceResponse[]>(path, accessToken, init)).map(toPlace);
}

/** 빠른 장소 기록을 등록 화면이 쓰는 카카오 검색 결과 형식으로 바꿉니다. */
export function kakaoPlaceFromQuickDraft(draft: QuickPlaceDraft): KakaoPlaceResult {
  return {
    id: draft.providerPlaceId,
    place_name: draft.placeName,
    category_name: draft.category ?? "",
    phone: draft.providerPhone ?? "",
    // 도로명 주소가 없는 가게에 지번 주소를 도로명 자리로 넣지 않습니다(대표 주소는 kakaoPlaceAddress가 고름).
    address_name: draft.lotAddress ?? draft.address,
    road_address_name: draft.roadAddress ?? "",
    x: String(draft.longitude),
    y: String(draft.latitude),
    place_url: draft.providerUrl ?? "",
  };
}

/** 카카오 장소인 맛집을 등록 화면의 선택 장소 형식으로 바꿉니다. 다른 제공처 장소면 null입니다. */
export function kakaoPlaceFromPlace(place: Place): KakaoPlaceResult | null {
  if (place.providerCode !== KAKAO_PROVIDER_CODE) return null;
  return {
    id: place.providerPlaceId,
    place_name: place.name,
    category_name: place.category,
    phone: place.providerPhone ?? "",
    address_name: place.lotAddress ?? place.address,
    road_address_name: place.roadAddress ?? "",
    x: String(place.longitude),
    y: String(place.latitude),
    place_url: place.providerUrl ?? "",
  };
}

// 검색어가 바뀌면 이전 요청을 취소해 늦게 도착한 응답이 최신 결과를 덮지 않게 합니다.
export function getPlaces(accessToken: string, search: string, signal?: AbortSignal): Promise<Place[]> {
  return requestPlaces(search ? `?q=${encodeURIComponent(search)}` : "", accessToken, {
    signal,
    errorMessage: "맛집을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.",
  });
}

export function getPlace(accessToken: string, id: string): Promise<Place> {
  return requestPlace(`/${encodeURIComponent(id)}`, accessToken, { errorMessage: "맛집 정보를 불러오지 못했어요." });
}

/** 장소 API도 공통 요청 도구를 거쳐 로그인 만료와 오류 메시지를 다른 화면과 같게 처리합니다. */
function request<T>(path: string, accessToken: string, init: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(`${API_BASE_URL}/v1/places${path}`, accessToken, {
    errorMessage: "맛집 정보를 처리하지 못했어요.",
    ...init,
  });
}

export function getMyPlaceRecords(accessToken: string): Promise<Place[]> {
  return requestPlaces("/records/mine", accessToken);
}

export function getRecentPlaces(accessToken: string): Promise<Place[]> {
  return requestPlaces("/recent", accessToken);
}

export function rememberRecentPlace(accessToken: string, placeId: string): Promise<void> {
  return request("/recent", accessToken, { method: "POST", body: JSON.stringify({ placeId }) });
}

export function getQuickPlaceDrafts(accessToken: string): Promise<QuickPlaceDraft[]> {
  return request("/drafts", accessToken);
}

export function checkQuickPlaceDuplicate(accessToken: string, place: KakaoPlaceResult): Promise<QuickPlaceDuplicate> {
  const params = new URLSearchParams({ providerCode: KAKAO_PROVIDER_CODE, providerPlaceId: place.id });
  return request(`/drafts/check?${params.toString()}`, accessToken);
}

/** 빠른 저장과 가볼 곳 저장이 함께 보내는 카카오 가게 기본 정보입니다. */
function kakaoPlaceBody(place: KakaoPlaceResult) {
  return {
    providerCode: KAKAO_PROVIDER_CODE,
    providerPlaceId: place.id,
    placeName: place.place_name,
    category: place.category_name,
    address: kakaoPlaceAddress(place),
    roadAddress: place.road_address_name || null,
    lotAddress: place.address_name || null,
    ...kakaoPlaceCoordinates(place),
    providerPhone: place.phone || null,
    providerUrl: place.place_url || null,
  };
}

/** 가게에서 빠른 저장을 합니다. deviceLocation은 지금 기기 위치로, 장소 서비스가 가게와 VISIT_RADIUS_METERS 안인지 다시 확인합니다. */
export function saveQuickPlaceDraft(
  accessToken: string,
  place: KakaoPlaceResult,
  deviceLocation: Coordinates | null,
): Promise<QuickPlaceDraft> {
  return request("/drafts", accessToken, {
    method: "POST",
    body: JSON.stringify({ ...kakaoPlaceBody(place), deviceLocation }),
  });
}

/**
 * 카카오에서 검색한 가게를 가볼 곳(가 보고 싶어요 하트)으로 저장합니다. 지역·방문과 상관없이 저장되고, 저장된 가게를 돌려줍니다.
 * 이미 하트했거나 내 기록이 있는 가게면 하트는 그대로 둡니다.
 */
export function saveWishPlace(accessToken: string, place: KakaoPlaceResult): Promise<Place> {
  return requestPlace("/wishes", accessToken, {
    method: "POST",
    // 장소 행을 새로 만들 수 있어 분류가 비면 기록과 같은 기본값(음식점)을 넣습니다.
    body: JSON.stringify({ ...kakaoPlaceBody(place), category: place.category_name || "음식점" }),
    errorMessage: "가볼 곳으로 저장하지 못했어요.",
  });
}

export function deleteQuickPlaceDraft(
  accessToken: string,
  providerPlaceId: string,
  providerCode: string,
): Promise<void> {
  return request(
    `/drafts/${encodeURIComponent(providerPlaceId)}?providerCode=${encodeURIComponent(providerCode)}`,
    accessToken,
    { method: "DELETE" },
  );
}

/**
 * 새 기록·수정을 장소 서비스 CreatePlaceRecordRequest 본문으로 바꿉니다. 하트한 곳을 기록해도 같은 본문이고, 서버가
 * 그 장소의 하트·별로였던 곳 표시를 지웁니다.
 */
function placeRecordBody(place: NewPlace) {
  return {
    providerCode: place.providerCode,
    providerPlaceId: place.providerPlaceId,
    placeName: place.name,
    category: place.category,
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
    tagGroups: place.tagGroups,
    visitConditions: place.visitConditions,
    photos: place.photos,
    deviceLocation: place.deviceLocation ?? null,
  };
}

export function createPlaceRecord(accessToken: string, place: NewPlace): Promise<Place> {
  return requestPlace("/records", accessToken, {
    method: "POST",
    body: JSON.stringify(placeRecordBody(place)),
  });
}

/** 내 기록 여러 곳을 한 번에 공개하거나 나만 보기로 바꿉니다. changed는 실제로 바뀐 기록 수입니다. */
export function changeRecordVisibility(
  accessToken: string,
  placeIds: string[],
  visibility: "PUBLIC" | "PRIVATE",
): Promise<{ changed: number }> {
  return request("/records/visibility", accessToken, {
    method: "PUT",
    body: JSON.stringify({ placeIds, visibility }),
  });
}

/** 이 장소의 내 기록을 지웁니다. 사진·메뉴·태그까지 함께 지워지고 되돌릴 수 없습니다. */
export function deleteMyPlaceRecord(accessToken: string, placeId: string): Promise<void> {
  return request(`/records/${encodeURIComponent(placeId)}`, accessToken, {
    method: "DELETE",
    errorMessage: "기록을 지우지 못했어요.",
  });
}

/** 맛집 정보 제보 이유입니다. 장소 서비스 PlaceReportReason과 같습니다. */
export type PlaceReportReason = "CLOSED" | "WRONG_NAME" | "WRONG_ADDRESS" | "WRONG_PHONE" | "WRONG_LOCATION" | "OTHER";

/** 맛집 기본 정보 오류·폐업을 알립니다. duplicate는 확인 전인 같은 제보가 이미 있었다는 뜻입니다. */
export function reportPlace(
  accessToken: string,
  placeId: string,
  reason: PlaceReportReason,
  memo: string,
): Promise<{ duplicate: boolean }> {
  return request(`/${encodeURIComponent(placeId)}/reports`, accessToken, {
    method: "POST",
    body: JSON.stringify({ reason, memo: memo.trim() || null }),
    errorMessage: "제보를 보내지 못했어요.",
  });
}

/** 맛다공 탈퇴: 장소 서비스에 남은 내 기록·하트·다녀온 곳·별로였던 곳·최근 본 장소·빠른 기록·제보를 모두 지웁니다. */
export function deleteMyPlaceData(accessToken: string): Promise<void> {
  return request("/me", accessToken, { method: "DELETE", errorMessage: "내 맛집 기록을 지우지 못했어요." });
}

export function getLikedPlaceIds(accessToken: string): Promise<string[]> {
  return request("/likes", accessToken);
}

/** 하트를 가볼 곳(가 보고 싶어요)으로 저장하거나 지웁니다. */
export function setPlaceLiked(accessToken: string, placeId: string, isLiked: boolean): Promise<void> {
  return request(`/${encodeURIComponent(placeId)}/like`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ liked: isLiked }),
  });
}

/**
 * 다녀온 곳: 빠른 저장했거나 기록한 적이 있는 장소입니다. 기록을 지워도 남고, 빠른 저장을 지우면 빠집니다(기록한 적이 없을 때).
 * 이 장소는 위치 확인 없이 언제든 기록할 수 있고, 별로였던 곳과 함께 '별로였어요'의 방문 근거가 됩니다(useMyPlaces).
 */
export function getVisitedPlaceIds(accessToken: string): Promise<string[]> {
  return request("/visits", accessToken);
}

/** 다녀왔지만 별로였던 곳입니다. 발견·내 지도의 지도 마커에서 빠지고 맛객 신뢰에 엇갈림으로 반영됩니다(피드에는 그대로). */
export function getDislikedPlaceIds(accessToken: string): Promise<string[]> {
  return request("/dislikes", accessToken);
}

/** deviceLocation은 방문 근거(다녀온 곳 등)가 없을 때 보내는 지금 위치로, 서버가 가게 VISIT_RADIUS_METERS 안인지 다시 확인합니다. */
export function setPlaceDisliked(
  accessToken: string,
  placeId: string,
  isDisliked: boolean,
  deviceLocation: Coordinates | null = null,
): Promise<void> {
  return request(`/${encodeURIComponent(placeId)}/dislike`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ disliked: isDisliked, deviceLocation }),
  });
}
