/** 카카오 지도 SDK 불러오기와 카카오 장소 검색입니다. SDK는 한 번만 불러와 지도와 검색이 함께 씁니다. */
import { distanceMeters, kakaoPlaceCoordinates, type Coordinates } from "../utils/geo";

let sdkPromise: Promise<void> | undefined;

// 장소 검색 한 번에 받을 결과 수입니다.
const SEARCH_RESULT_SIZE = 8;

/** 카카오 SDK를 한 번만 불러옵니다. 불러오지 못하면 다음 호출 때 다시 시도합니다. */
export function loadMapSdk() {
  if (sdkPromise) return sdkPromise;
  const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim();
  if (!key) return Promise.reject(new Error("카카오 지도 키가 등록되지 않았어요."));
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(resolve);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao?.maps.load(resolve);
    script.onerror = () => {
      sdkPromise = undefined;
      script.remove();
      reject(new Error("등록한 지도 도메인으로 접속해 주세요. 현재 개발 주소는 localhost:5845입니다."));
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/**
 * 카카오 장소를 키워드로 검색합니다. nearby를 주면 그 중심의 반경 안에서 찾습니다.
 * 내 지도 검색은 지역 없이 바로, 기록하기·빠른 저장은 searchNearbyKakaoPlaces로 부르며, 결과의 id(카카오 장소 ID)로 같은 장소를 구분합니다.
 */
export async function searchKakaoPlaces(
  keyword: string,
  nearby?: { center: Coordinates; radiusMeters: number },
): Promise<KakaoPlaceResult[]> {
  await loadMapSdk();
  const maps = window.kakao?.maps;
  const services = maps?.services;
  if (!maps || !services) throw new Error("카카오 장소 검색을 불러오지 못했어요.");
  return new Promise((resolve, reject) => {
    new services.Places().keywordSearch(
      keyword,
      (results, status) => {
        if (status === services.Status.OK) resolve(results);
        else if (status === services.Status.ZERO_RESULT) resolve([]);
        else reject(new Error("장소 검색에 실패했어요. 잠시 후 다시 시도해 주세요."));
      },
      {
        size: SEARCH_RESULT_SIZE,
        ...(nearby
          ? {
              location: new maps.LatLng(nearby.center.latitude, nearby.center.longitude),
              radius: nearby.radiusMeters,
            }
          : {}),
      },
    );
  });
}

/** 지금 위치 주변 radiusMeters 안의 카카오 장소만 찾습니다. 받은 결과도 좌표로 한 번 더 걸러 반경 밖 가게를 뺍니다. */
export async function searchNearbyKakaoPlaces(
  keyword: string,
  center: Coordinates,
  radiusMeters: number,
): Promise<KakaoPlaceResult[]> {
  const results = await searchKakaoPlaces(keyword, { center, radiusMeters });
  return results.filter((place) => distanceMeters(center, kakaoPlaceCoordinates(place)) <= radiusMeters);
}

/** 카카오 장소 분류 코드: 음식점(FD6)·카페(CE7). 맛다공이 다루는 가게입니다. */
const EATERY_CATEGORY_CODES = ["FD6", "CE7"] as const;

/**
 * 검색어 없이 지금 위치 근처의 음식점·카페를 가까운 순으로 찾습니다(기록하기 1단계·빠른 저장의 검색 전 근처 목록, 보드 11-01·12-04).
 * 반경 밖 가게는 좌표로 한 번 더 뺍니다.
 */
export async function findNearbyEateries(center: Coordinates, radiusMeters: number): Promise<KakaoPlaceResult[]> {
  await loadMapSdk();
  const maps = window.kakao?.maps;
  const services = maps?.services;
  if (!maps || !services) throw new Error("카카오 장소 검색을 불러오지 못했어요.");
  const lists = await Promise.all(
    EATERY_CATEGORY_CODES.map(
      (code) =>
        new Promise<KakaoPlaceResult[]>((resolve) => {
          new services.Places().categorySearch(
            code,
            (results, status) => resolve(status === services.Status.OK ? results : []),
            {
              location: new maps.LatLng(center.latitude, center.longitude),
              radius: radiusMeters,
              size: SEARCH_RESULT_SIZE,
              sort: services.SortBy.DISTANCE,
            },
          );
        }),
    ),
  );
  const distanceOf = (place: KakaoPlaceResult) => distanceMeters(center, kakaoPlaceCoordinates(place));
  return lists
    .flat()
    .filter((place) => distanceOf(place) <= radiusMeters)
    .sort((left, right) => distanceOf(left) - distanceOf(right))
    .slice(0, SEARCH_RESULT_SIZE);
}

/**
 * "서울특별시 마포구"처럼 지역 이름으로 그 지역의 가운데 좌표를 찾습니다(발견 지역 선택, 보드 05-02).
 * 카카오 주소 검색을 먼저 쓰고, 행정구역 이름이 바뀌어 주소로 못 찾으면 같은 이름의 장소 검색 첫 결과로 대신합니다. 못 찾으면 null입니다.
 */
export async function findRegionCenter(query: string): Promise<Coordinates | null> {
  await loadMapSdk();
  const services = window.kakao?.maps.services;
  if (!services) return null;
  const byAddress = await new Promise<Coordinates | null>((resolve) => {
    new services.Geocoder().addressSearch(query, (results, status) => {
      const first = status === services.Status.OK ? results[0] : undefined;
      resolve(first ? { latitude: Number(first.y), longitude: Number(first.x) } : null);
    });
  });
  if (byAddress) return byAddress;
  const [place] = await searchKakaoPlaces(query).catch(() => []);
  return place ? kakaoPlaceCoordinates(place) : null;
}

/**
 * 발견 제목·지역 버튼, 빠른 저장의 "현재 위치"에 쓸 동네 이름(예: 망원동)을 카카오 지도 SDK의 좌표→행정구역 변환으로 찾습니다.
 * 실패하면 빈 문자열입니다.
 */
export async function regionNameAt(position: Coordinates): Promise<string> {
  try {
    await loadMapSdk();
    const services = window.kakao?.maps.services;
    if (!services) return "";
    const geocoder = new services.Geocoder();
    return await new Promise<string>((resolve) => {
      geocoder.coord2RegionCode(position.longitude, position.latitude, (result, status) => {
        if (status !== services.Status.OK) return resolve("");
        const region = result.find((item) => item.region_type === "H") ?? result[0];
        resolve(region?.region_3depth_name || region?.region_2depth_name || "");
      });
    });
  } catch {
    return "";
  }
}
