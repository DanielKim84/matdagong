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
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
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
