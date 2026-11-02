import type { RegionData } from "../models/region";

const LEGAL_DONG_URL = "/data/kr-legal-dong.json";

/** 활동 지역 고르기에 쓰는 법정동 지역 목록을 읽습니다. 앱과 함께 배포되는 정적 파일이라 로그인 토큰이 필요 없습니다. */
export async function getLegalDongRegions(): Promise<RegionData[]> {
  const response = await fetch(LEGAL_DONG_URL);
  if (!response.ok) throw new Error("지역 목록을 불러오지 못했습니다.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("regions" in data) || !Array.isArray(data.regions)) {
    throw new Error("지역 목록을 불러오지 못했습니다.");
  }
  return data.regions;
}
