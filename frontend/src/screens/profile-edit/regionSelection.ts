/** 프로필 편집의 활동 지역 한 곳 고르기(시·도 → 시·군·구 → 읍·면·동) 선택값 계산입니다. 고른 곳은 공식 이름을 이은 한 줄로 저장합니다. */
import type { RegionData } from "../../models/region";

export type RegionSelection = { sido: string; district: string; dong: string };

export const EMPTY_REGION_SELECTION: RegionSelection = { sido: "", district: "", dong: "" };

// 법정동 목록에서 시·군·구가 없는 세종시는 "(직할)"로 들어 있어 화면에는 "세종시"로 보여 줍니다.
const DIRECT_DISTRICT = "(직할)";
const DIRECT_DISTRICT_LABEL = "세종시";

/** 화면에 보일 시·군·구 이름입니다. */
export function districtLabel(district: string): string {
  return district === DIRECT_DISTRICT ? DIRECT_DISTRICT_LABEL : district;
}

/** 화면에서 고른 시·군·구 이름을 목록 값으로 되돌립니다. */
export function districtFromLabel(label: string): string {
  return label === DIRECT_DISTRICT_LABEL ? DIRECT_DISTRICT : label;
}

/** 고른 시·도의 시·군·구 목록(화면 이름)입니다. */
export function districtOptions(regions: RegionData[], sido: string): string[] {
  return (regions.find((region) => region.name === sido)?.districts ?? []).map((district) =>
    districtLabel(district.name),
  );
}

/** 고른 시·군·구의 읍·면·동 목록입니다. 리 단위는 첫 단어만 남겨 겹치지 않게 합니다. */
export function dongOptions(regions: RegionData[], { sido, district }: RegionSelection): string[] {
  const dongs =
    regions.find((region) => region.name === sido)?.districts.find((item) => item.name === district)?.dongs ?? [];
  return [...new Set(dongs.map((name) => name.split(" ")[0]))];
}

/** 고른 시·도(·시·군·구·읍·면·동)를 공식 이름을 이은 한 줄로 합칩니다. 활동 지역 목록의 한 칸(서버 activityRegions의 원소)입니다. */
export function joinRegionSelection({ sido, district, dong }: RegionSelection): string {
  return [sido, district && district !== DIRECT_DISTRICT ? district : "", dong].filter(Boolean).join(" ");
}
