import type { RegionData } from "../../models/region";

export type RegionSelection = { sido: string; district: string; dong: string };

export const EMPTY_REGION_SELECTION: RegionSelection = { sido: "", district: "", dong: "" };

// 법정동 목록에서 시·군·구가 없는 세종시는 "(직할)"로 들어 있어 화면에는 "세종시"로 보여 줍니다.
const DIRECT_DISTRICT = "(직할)";
const DIRECT_DISTRICT_LABEL = "세종시";

// 예전에 직접 입력해 저장한 줄임 이름("서울 마포구")도 공식 이름으로 되살리기 위한 표입니다.
const REGION_ALIASES: Record<string, string[]> = {
  서울특별시: ["서울"],
  부산광역시: ["부산"],
  대구광역시: ["대구"],
  인천광역시: ["인천"],
  광주광역시: ["광주"],
  대전광역시: ["대전"],
  울산광역시: ["울산"],
  세종특별자치시: ["세종"],
  경기도: ["경기"],
  강원특별자치도: ["강원", "강원도"],
  충청북도: ["충북"],
  충청남도: ["충남"],
  전북특별자치도: ["전북", "전라북도"],
  전라남도: ["전남"],
  경상북도: ["경북"],
  경상남도: ["경남"],
  제주특별자치도: ["제주", "제주도"],
};

/** 저장된 한 줄 지역 문자열을 시·도, 시·군·구, 읍·면·동 선택으로 되돌립니다. */
export function restoreRegionSelection(value: string | null | undefined, regions: RegionData[]): RegionSelection {
  const saved = value?.trim() ?? "";
  const selectedRegion = regions.find(
    (region) => saved.includes(region.name) || REGION_ALIASES[region.name]?.some((alias) => saved.startsWith(alias)),
  );
  const sido = selectedRegion?.name ?? "";
  const district =
    selectedRegion?.districts.find((item) => item.name !== DIRECT_DISTRICT && saved.includes(item.name))?.name ??
    selectedRegion?.districts.find((item) => item.name === DIRECT_DISTRICT)?.name ??
    "";
  const dong =
    selectedRegion?.districts
      .find((item) => item.name === district)
      ?.dongs.map((name) => name.split(" ")[0])
      .find((name) => saved.includes(name)) ?? "";
  return { sido, district, dong };
}

/** 화면에 보일 시·군·구 이름입니다. */
export function districtLabel(district: string): string {
  return district === DIRECT_DISTRICT ? DIRECT_DISTRICT_LABEL : district;
}

/** 화면에서 고른 시·군·구 이름을 목록 값으로 되돌립니다. */
export function districtFromLabel(label: string): string {
  return label === DIRECT_DISTRICT_LABEL ? DIRECT_DISTRICT : label;
}

export function districtOptions(regions: RegionData[], sido: string): string[] {
  return (regions.find((region) => region.name === sido)?.districts ?? []).map((district) =>
    districtLabel(district.name),
  );
}

export function dongOptions(regions: RegionData[], { sido, district }: RegionSelection): string[] {
  const dongs =
    regions.find((region) => region.name === sido)?.districts.find((item) => item.name === district)?.dongs ?? [];
  return [...new Set(dongs.map((name) => name.split(" ")[0]))];
}

/** 일부만 고른 상태인지 봅니다. 아무것도 고르지 않은 것은 허용합니다. */
export function isIncompleteRegion({ sido, district, dong }: RegionSelection): boolean {
  return Boolean(sido || district || dong) && (!sido || !district || !dong);
}

/** 기존 API 호환을 위해 저장할 때 한 문자열로 합칩니다. */
export function joinRegionSelection({ sido, district, dong }: RegionSelection): string {
  return [sido, district && district !== DIRECT_DISTRICT ? district : "", dong].filter(Boolean).join(" ");
}
