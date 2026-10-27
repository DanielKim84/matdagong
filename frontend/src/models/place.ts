export interface Place {
  id: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  emoji: string;
  accentColor: string;
  visitedOn: string;
  recentNote: string;
  recordCount: number;
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
  avatarColor: string;
  note: string;
  profileCoverUrl?: string | null;
  tasterFocus?: "RESTAURANT" | "CAFE_DESSERT" | "BOTH";
  intro?: string;
  postCount?: number;
  followerCount?: number;
  followingCount?: number;
  profileTags?: string[];
  matchedTags?: string[];
  matchScore?: number;
}

export type NewPlace = {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  reason: string;
  menus: string[];
  tags: string[];
  visitConditions: VisitCondition[];
  photos: string[];
  visibility: "public" | "subscribers";
  createdAt: string;
};

export type MapKind = "other" | "subscribed" | "ad";
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
  | "settings"
  | "profile-edit"
  | "intro"
  | "liked"
  | "recent";
