import type { FoodFocus, TasteTag } from "./community";

/** 취향 태그 묶음(음식 종류·맛·카페·방문 스타일·피할 조건)의 이름·순서·선택 한도입니다. */
export type TasteTagGroup = TasteTag["tagGroup"];

const GROUPS_BY_FOCUS: Record<FoodFocus, TasteTagGroup[]> = {
  RESTAURANT: ["CUISINE", "TASTE", "OCCASION"],
  CAFE_DESSERT: ["CAFE", "OCCASION"],
  BOTH: ["CUISINE", "TASTE", "CAFE", "OCCASION"],
};

/** 분야 선택과 태그 노출·저장 규칙이 화면마다 달라지지 않게 공통으로 씁니다. */
export function groupsForFocus(focus: FoodFocus): TasteTagGroup[] {
  return GROUPS_BY_FOCUS[focus];
}

export function filterTagsForFocus(tags: string[], focus: FoodFocus, options: TasteTag[]): string[] {
  const visibleGroups = groupsForFocus(focus);
  return tags.filter((name) => options.some((tag) => tag.name === name && visibleGroups.includes(tag.tagGroup)));
}

/** 메뉴 취향(가입 취향 단계, 프로필 편집 기본값)에 보이는 묶음입니다. VISIT(피하고 싶은 조건)는 따로 고릅니다. */
export const MENU_TASTE_TAG_GROUPS: readonly TasteTagGroup[] = ["CUISINE", "TASTE", "CAFE", "OCCASION"];

/** 고르는 화면(태그 고르기, 태그 제안)의 묶음 이름입니다. */
export const TASTE_TAG_GROUP_LABELS: Record<TasteTagGroup, string> = {
  CUISINE: "음식 종류",
  TASTE: "맛과 메뉴",
  CAFE: "카페와 디저트",
  OCCASION: "방문 스타일",
  VISIT: "피하고 싶은 조건",
};

/** 맛객 프로필에 보이는 묶음 이름입니다. 프로필의 VISIT 태그는 피할 조건이 아니라 매장 이용 정보로 읽힙니다. */
export const PROFILE_TASTE_TAG_GROUP_LABELS: Record<TasteTagGroup, string> = {
  ...TASTE_TAG_GROUP_LABELS,
  VISIT: "매장 이용",
};

type TasteTagGroupInfo = { id: TasteTagGroup; label: string; hint: string; limit: number };

/**
 * 취향 태그 묶음의 표시 순서·이름·안내·선택 한도입니다. 가입 취향 단계(TasteChips)와 프로필 편집(TasteTagPicker)이
 * 같은 한도를 써야 가입 때 고른 태그가 설정 화면에서도 그대로 이어집니다.
 */
export const TASTE_TAG_GROUPS: readonly TasteTagGroupInfo[] = [
  { id: "CUISINE", label: TASTE_TAG_GROUP_LABELS.CUISINE, hint: "어떤 음식 분야를 즐겨 찾나요?", limit: 5 },
  { id: "TASTE", label: TASTE_TAG_GROUP_LABELS.TASTE, hint: "좋아하는 맛이나 메뉴를 골라요.", limit: 10 },
  { id: "CAFE", label: TASTE_TAG_GROUP_LABELS.CAFE, hint: "커피와 달콤한 취향을 골라요.", limit: 5 },
  { id: "OCCASION", label: TASTE_TAG_GROUP_LABELS.OCCASION, hint: "함께 가거나 즐기는 상황을 골라요.", limit: 10 },
  { id: "VISIT", label: TASTE_TAG_GROUP_LABELS.VISIT, hint: "이 조건이 있는 장소를 추천에서 빼요.", limit: 5 },
];
