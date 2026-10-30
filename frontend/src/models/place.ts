export interface Place {
  id: string;
  /** 장소 정보 제공처입니다. 현재는 카카오(KAKAO)만 사용합니다. */
  providerCode?: string;
  /** 제공처의 장소 ID(카카오 장소 ID). 같은 가게의 맛객 기록을 하나의 장소로 묶는 기준입니다. */
  providerPlaceId?: string;
  roadAddress?: string;
  lotAddress?: string;
  providerPhone?: string;
  providerUrl?: string;
  visibility?: "private" | "public";
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  recentNote: string;
  recordCount: number;
  advertisement?: boolean;
  visitConditions?: VisitCondition[];
  tasters: Taster[];
}

// 직접 방문해 확인한 운영 시간과 매장 이용 정보를 맛객 기록에 남깁니다.
export const VISIT_CONDITIONS = [
  "웨이팅 있는 곳", "주차 불가", "주차 공간 협소", "노키즈존", "불친절 경험",
  "친절 경험", "주차 편리", "24시간 영업", "늦게까지 영업", "브레이크타임 있음", "예약 권장",
] as const;
export type VisitCondition = typeof VISIT_CONDITIONS[number];

/** 매장 정보는 주제별로 묶고, 서로 반대되는 상태만 한 항목 안에서 하나 고릅니다. */
export const VISIT_CONDITION_GROUPS: {
  title: string; hint: string; exclusive: boolean; conditions: VisitCondition[];
}[] = [
  { title: "주차", hint: "가장 가까운 상태 하나를 선택해 주세요.", exclusive: true, conditions: ["주차 편리", "주차 불가", "주차 공간 협소"] },
  { title: "영업 시간", hint: "특징이 있는 영업 정보만 남겨 주세요.", exclusive: true, conditions: ["24시간 영업", "늦게까지 영업"] },
  { title: "응대 경험", hint: "방문했을 때 느낀 응대 하나를 선택해 주세요.", exclusive: true, conditions: ["친절 경험", "불친절 경험"] },
  { title: "이용 안내", hint: "함께 적용될 수 있는 조건은 여러 개 고를 수 있어요.", exclusive: false, conditions: ["웨이팅 있는 곳", "노키즈존", "브레이크타임 있음", "예약 권장"] },
];

/** 저장해 둔 입력 등 외부 값에서 알려진 매장 이용 정보만 골라낼 때 씁니다. */
export function isVisitCondition(name: string): name is VisitCondition {
  return VISIT_CONDITIONS.some((condition) => condition === name);
}

export interface Taster {
  tasterId: string;
  tasterName: string;
  tag: string;
  avatar: string;
  avatarVariant: number;
  note: string;
  menus?: (string | RecommendedMenu)[];
  photos?: string[];
  tags?: string[];
  tagGroups?: Record<string, string>;
  visitConditions?: VisitCondition[];
  profileCoverUrl?: string | null;
  profileCoverUrls?: string[];
  tasterFocus?: "RESTAURANT" | "CAFE_DESSERT" | "BOTH";
  activityScope?: "LOCAL" | "TRAVEL" | "BOTH";
  activityRegion?: string | null;
  intro?: string;
  subscriberCount?: number;
  placeCount?: number;
  profileTags?: string[];
  matchedTags?: string[];
  matchScore?: number;
  visibility?: "PRIVATE" | "PUBLIC";
}

/** 맛객이 직접 추천한 메뉴명과 가격입니다. 가격을 모르면 비워 둘 수 있습니다. */
export type RecommendedMenu = { name: string; price?: number; photo?: string };

export type NewPlace = {
  id: string;
  providerCode?: string;
  providerPlaceId?: string;
  roadAddress?: string;
  lotAddress?: string;
  providerPhone?: string;
  providerUrl?: string;
  name: string;
  category?: string;
  address: string;
  latitude: number;
  longitude: number;
  reason: string;
  menus: RecommendedMenu[];
  tags: string[];
  tagGroups?: Record<string, string>;
  visitConditions: VisitCondition[];
  photos: string[];
  visibility: "private" | "public";
  createdAt: string;
};

export type MapKind = "other" | "subscribed" | "subscribedPhoto" | "ad" | "liked" | "own" | "matched";
export type Screen =
  | "home"
  | "map"
  | "register"
  | "my"
  | "place"
  | "profile"
  | "notifications"
  | "diary"
  | "saved"
  | "subscriptions"
  | "taster-recommendations"
  | "settings"
  | "profile-edit"
  | "intro"
  | "liked"
  | "recent";
