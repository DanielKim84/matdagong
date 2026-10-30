let sdkPromise: Promise<void> | undefined;

export function loadMapSdk() {
  if (sdkPromise) return sdkPromise;
  const key = import.meta.env.VITE_KAKAO_MAP_APP_KEY?.trim();
  if (!key)
    return Promise.reject(new Error("카카오 지도 키가 등록되지 않았어요."));
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
      reject(
        new Error(
          "등록한 지도 도메인으로 접속해 주세요. 현재 개발 주소는 localhost:4845입니다.",
        ),
      );
    };
    document.head.appendChild(script);
  });
  return sdkPromise;
}

/**
 * 카카오 장소를 키워드로 검색합니다. center를 주면 그 주변 radiusMeters 안에서 찾습니다.
 * 맛집 등록과 빠른 장소 기록에서 쓰며, 결과의 id(카카오 장소 ID)로 같은 장소를 구분합니다.
 */
export async function searchKakaoPlaces(
  keyword: string,
  center?: { latitude: number; longitude: number },
  radiusMeters = 1000,
): Promise<KakaoPlaceResult[]> {
  await loadMapSdk();
  const services = window.kakao?.maps.services;
  if (!services) throw new Error("카카오 장소 검색을 불러오지 못했어요.");
  return new Promise((resolve, reject) => {
    new services.Places().keywordSearch(keyword, (results, status) => {
      if (status === services.Status.OK) resolve(results);
      else if (status === services.Status.ZERO_RESULT) resolve([]);
      else reject(new Error("장소 검색에 실패했어요. 잠시 후 다시 시도해 주세요."));
    }, {
      size: 8,
      ...(center ? {
        location: new window.kakao!.maps.LatLng(center.latitude, center.longitude),
        radius: radiusMeters,
      } : {}),
    });
  });
}
