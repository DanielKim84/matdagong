import type { FoodFocus, TasteTag } from "../services/community";

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
