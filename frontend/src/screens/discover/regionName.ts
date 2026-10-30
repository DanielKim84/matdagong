import { loadMapSdk } from "../../services/kakao";
import type { Coordinates } from "../../utils/geo";

type RegionResult = { region_type: string; region_3depth_name: string; region_2depth_name: string };
type Geocoder = {
  coord2RegionCode(longitude: number, latitude: number, callback: (result: RegionResult[], status: string) => void): void;
};

/**
 * 검색창 앞에 붙일 동네 이름(예: 망원동)을 카카오 지도 SDK의 좌표→행정구역 변환으로 찾습니다.
 * SDK 타입 선언(models/kakao.d.ts)에 Geocoder가 없어 이 파일 안에서만 좁혀 씁니다. 실패하면 빈 문자열입니다.
 */
export async function regionNameAt(position: Coordinates): Promise<string> {
  try {
    await loadMapSdk();
    const services = window.kakao?.maps.services as unknown as { Geocoder?: new () => Geocoder; Status: { OK: string } } | undefined;
    if (!services?.Geocoder) return "";
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
