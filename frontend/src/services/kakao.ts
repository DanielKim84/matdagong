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

/** 등록 폼에서 카카오 장소 검색 결과를 고르고 동일 장소 식별자를 보존합니다. */
export async function searchKakaoPlaces(keyword: string): Promise<KakaoPlaceResult[]> {
  await loadMapSdk();
  const services = window.kakao?.maps.services;
  if (!services) throw new Error("카카오 장소 검색을 불러오지 못했어요.");
  return new Promise((resolve, reject) => {
    new services.Places().keywordSearch(keyword, (results, status) => {
      if (status === services.Status.OK) resolve(results);
      else if (status === services.Status.ZERO_RESULT) resolve([]);
      else reject(new Error("장소 검색에 실패했어요. 잠시 후 다시 시도해 주세요."));
    }, { size: 8 });
  });
}
