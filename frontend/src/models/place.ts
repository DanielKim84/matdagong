export interface Place {
  id: string;
  /** 카카오 장소 ID. 같은 가게의 맛객 기록을 하나의 장소로 묶는 기준입니다. */
  providerPlaceId?: string;
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
  /** 지도 화면에서 샘플 계정 관계별 핀을 확인하기 위한 개발용 분류입니다. */
  sampleMarkerKind?: MapKind | "own";
  visitConditions?: VisitCondition[];
  tasters: Taster[];
}

// 방문자가 확인해 기록하는 장소 조건입니다. 불친절은 개인의 경험으로 표시합니다.
export const VISIT_CONDITIONS = [
  "웨이팅 있는 곳", "주차 불가", "주차 공간 협소", "노키즈존", "불친절 경험",
] as const;
export type VisitCondition = typeof VISIT_CONDITIONS[number];

/** 장소 등록과 취향 설정에서 같은 제외 조건 목록을 사용합니다. */
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
  visitConditions?: VisitCondition[];
  profileCoverUrl?: string | null;
  tasterFocus?: "RESTAURANT" | "CAFE_DESSERT" | "BOTH";
  activityScope?: "LOCAL" | "TRAVEL" | "BOTH";
  activityRegion?: string | null;
  intro?: string;
  subscriberCount?: number;
  profileTags?: string[];
  matchedTags?: string[];
  matchScore?: number;
}

/** 맛객이 직접 추천한 메뉴명과 가격입니다. 가격을 모르면 비워 둘 수 있습니다. */
export type RecommendedMenu = { name: string; price?: number };

export type NewPlace = {
  id: string;
  providerPlaceId?: string;
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
  visitConditions: VisitCondition[];
  photos: string[];
  visibility: "private" | "public";
  createdAt: string;
};

export type MapKind = "other" | "subscribed" | "subscribedPhoto" | "ad" | "liked" | "matched";
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
