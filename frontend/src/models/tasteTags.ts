import type { FoodFocus, TasteTag } from "./community";

/** 취향 태그 분류(음식 종류·맛·메뉴·카페 종류·디저트·빵·여행·드라이브·뷰·분위기·이럴 때·매장 이용)입니다. */
export type TasteTagGroup = TasteTag["tagGroup"];

export const TASTE_TAG_GROUP_LABELS: Record<TasteTagGroup, string> = {
  CUISINE: "음식 종류",
  TASTE: "맛·메뉴",
  CAFE: "카페 종류",
  DESSERT: "디저트·빵",
  TRAVEL: "여행·드라이브",
  MOOD: "뷰·분위기",
  OCCASION: "이럴 때",
  VISIT: "매장 이용",
};

export type TasteTagGroupInfo = { id: TasteTagGroup; label: string; hint: string; limit: number };

/**
 * 분류의 표시 순서·이름·안내·한 분류에서 고를 수 있는 수입니다. 한도는 커뮤니티 서비스 TasteTagGroup.maxSelections와
 * 같게 둡니다(서버가 같은 값으로 다시 검사). 겹쳐 골라도 되는 큰 분류는 10개, 요점만 고르면 되는 분류는 5개입니다.
 * 가입 취향 단계·프로필 편집·기록하기가 모두 이 값을 써서 가입 때 고른 태그가 설정 화면에서도 그대로 이어집니다.
 */
export const TASTE_TAG_GROUPS: readonly TasteTagGroupInfo[] = [
  { id: "CUISINE", label: TASTE_TAG_GROUP_LABELS.CUISINE, hint: "즐겨 찾는 음식을 골라요.", limit: 10 },
  { id: "TASTE", label: TASTE_TAG_GROUP_LABELS.TASTE, hint: "좋아하는 맛과 메뉴 특징이에요.", limit: 5 },
  { id: "CAFE", label: TASTE_TAG_GROUP_LABELS.CAFE, hint: "자주 가는 카페 스타일이에요.", limit: 5 },
  { id: "DESSERT", label: TASTE_TAG_GROUP_LABELS.DESSERT, hint: "좋아하는 빵과 디저트를 골라요.", limit: 10 },
  { id: "TRAVEL", label: TASTE_TAG_GROUP_LABELS.TRAVEL, hint: "여행길에 찾는 맛집 스타일이에요.", limit: 5 },
  { id: "MOOD", label: TASTE_TAG_GROUP_LABELS.MOOD, hint: "좋아하는 풍경과 분위기를 골라요.", limit: 10 },
  { id: "OCCASION", label: TASTE_TAG_GROUP_LABELS.OCCASION, hint: "누구와, 어떤 때 가는지 골라요.", limit: 5 },
  { id: "VISIT", label: TASTE_TAG_GROUP_LABELS.VISIT, hint: "이 조건이 있는 맛집은 추천에서 빼요.", limit: 5 },
];

export function isTasteTagGroup(value: unknown): value is TasteTagGroup {
  return TASTE_TAG_GROUPS.some((group) => group.id === value);
}

/** 분야별로 보이는 분류입니다. 서버 FoodFocus.allowedGroups와 같고, 기록하기의 장소 분야(음식점·카페)도 같은 묶음을 씁니다. */
const GROUPS_BY_FOCUS: Record<FoodFocus, TasteTagGroup[]> = {
  RESTAURANT: ["CUISINE", "TASTE", "TRAVEL", "MOOD", "OCCASION"],
  CAFE_DESSERT: ["CAFE", "DESSERT", "TRAVEL", "MOOD", "OCCASION"],
  BOTH: ["CUISINE", "TASTE", "CAFE", "DESSERT", "TRAVEL", "MOOD", "OCCASION"],
};

/** 분야 선택과 태그 노출·저장 규칙이 화면마다 달라지지 않게 공통으로 씁니다. VISIT(매장 이용)는 들어 있지 않습니다. */
export function groupsForFocus(focus: FoodFocus): TasteTagGroup[] {
  return GROUPS_BY_FOCUS[focus];
}

/** 고른 태그 중 사전에 있고 그 분야에서 보이는 분류의 것만 남깁니다. 사전에서 빠진 옛 이름도 여기서 빠집니다. */
export function filterTagsForFocus(tags: string[], focus: FoodFocus, options: TasteTag[]): string[] {
  const visibleGroups = groupsForFocus(focus);
  return tags.filter((name) => options.some((tag) => tag.name === name && visibleGroups.includes(tag.tagGroup)));
}

/** 묶음을 알 수 없는 태그(사전에서 빠진 옛 이름 등)를 모아 맨 뒤에 보여 줄 묶음 열쇠입니다. */
const OTHER_TAG_GROUP = "OTHER";

export type TagGroupSection = { key: TasteTagGroup | typeof OTHER_TAG_GROUP; label: string; tags: string[] };

/**
 * 태그를 사전의 분류 순서대로 묶습니다(맛집 상세 "이런 곳이에요", 맛객 프로필 취향 탭).
 * groupOf가 분류를 모르는 태그는 버리지 않고 "기타"로 맨 뒤에 둡니다. 빈 묶음은 뺍니다.
 */
export function groupTagsByDictionary(
  tags: string[],
  groupOf: (tag: string) => TasteTagGroup | undefined,
): TagGroupSection[] {
  const sections: TagGroupSection[] = [
    ...TASTE_TAG_GROUPS.map((group) => ({
      key: group.id,
      label: group.label,
      tags: tags.filter((tag) => groupOf(tag) === group.id),
    })),
    { key: OTHER_TAG_GROUP, label: "기타", tags: tags.filter((tag) => !groupOf(tag)) },
  ];
  return sections.filter((section) => section.tags.length > 0);
}
