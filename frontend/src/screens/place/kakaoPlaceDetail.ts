/**
 * 내 지도 검색에서 고른 가게 중 맛다공에 아직 없는 카카오 가게를 상세(#place/kakao:<카카오 ID>)로 엽니다.
 * 가게 정보는 카카오 검색 결과 그대로이고, 새로 고쳐도 열리도록 탭 저장소에 둡니다(서버에는 이 ID의 장소가 없음).
 * 하트(가볼 곳 저장)를 누르면 그때 맛다공 장소로 저장하고 진짜 장소 ID의 상세로 바꿉니다.
 */
import { go } from "../../app/navigation";
import type { Place } from "../../models/place";
import { kakaoPlaceAddress, kakaoPlaceCoordinates } from "../../utils/geo";
import { isKakaoPlace, readStorageJson, STORAGE_KEYS, writeStorageJson } from "../../utils/storage";

/** 맛다공에 없는 카카오 가게 상세 ID 앞에 붙입니다. */
const KAKAO_PLACE_ID_PREFIX = "kakao:";

export function isKakaoOnlyPlaceId(id: string | undefined): boolean {
  return !!id?.startsWith(KAKAO_PLACE_ID_PREFIX);
}

export function openKakaoPlace(result: KakaoPlaceResult) {
  writeStorageJson(STORAGE_KEYS.kakaoPlaceDetail, result, "session");
  go("place", `${KAKAO_PLACE_ID_PREFIX}${result.id}`);
}

/** 상세 주소의 카카오 가게를 장소 모양으로 돌려줍니다. 탭 저장소에 둔 가게가 아니면(다른 가게·손상된 값) null입니다. */
export function kakaoPlaceForRoute(id: string): Place | null {
  const value = readStorageJson(STORAGE_KEYS.kakaoPlaceDetail, "session");
  if (!isKakaoPlace(value)) return null;
  return `${KAKAO_PLACE_ID_PREFIX}${value.id}` === id ? placeFromKakao(value) : null;
}

/** 기록이 없는 장소로 그립니다(recordCount 0, tasters 없음). */
function placeFromKakao(result: KakaoPlaceResult): Place {
  return {
    id: `${KAKAO_PLACE_ID_PREFIX}${result.id}`,
    providerCode: "KAKAO",
    providerPlaceId: result.id,
    name: result.place_name,
    category: result.category_name,
    address: kakaoPlaceAddress(result),
    roadAddress: result.road_address_name || undefined,
    lotAddress: result.address_name || undefined,
    providerPhone: result.phone || undefined,
    providerUrl: result.place_url || undefined,
    ...kakaoPlaceCoordinates(result),
    recentNote: "",
    recordCount: 0,
    tasters: [],
  };
}
