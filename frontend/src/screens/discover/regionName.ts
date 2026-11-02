import { loadMapSdk } from "../../services/kakao";
import type { Coordinates } from "../../utils/geo";

/**
 * 검색창 앞에 붙일 동네 이름(예: 망원동)을 카카오 지도 SDK의 좌표→행정구역 변환으로 찾습니다.
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
