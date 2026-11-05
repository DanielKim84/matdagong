/** 지도·목록·상세가 함께 쓰는 장소와 맛객 기록 자료형, 그리고 화면 주소(#화면) 목록입니다. */
import type { ActivityScope, FoodFocus } from "./community";
import type { TrustLevel } from "./trust";

export type Place = {
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
  visitConditions?: VisitCondition[];
  tasters: Taster[];
};

// 직접 방문해 확인한 운영 시간과 매장 이용 정보를 맛객 기록에 남깁니다.
const VISIT_CONDITIONS = [
  "웨이팅 있는 곳",
  "주차 불가",
  "주차 공간 협소",
  "노키즈존",
  "불친절 경험",
  "친절 경험",
  "주차 편리",
  "24시간 영업",
  "늦게까지 영업",
  "브레이크타임 있음",
  "예약 권장",
] as const;
export type VisitCondition = (typeof VISIT_CONDITIONS)[number];

/** 매장 정보는 주제별로 묶고, 서로 반대되는 상태만 한 항목 안에서 하나 고릅니다. */
export const VISIT_CONDITION_GROUPS: {
  title: string;
  hint: string;
  exclusive: boolean;
  conditions: VisitCondition[];
}[] = [
  {
    title: "주차",
    hint: "가장 가까운 상태 하나를 선택해 주세요.",
    exclusive: true,
    conditions: ["주차 편리", "주차 불가", "주차 공간 협소"],
  },
  {
    title: "영업 시간",
    hint: "특징이 있는 영업 정보만 남겨 주세요.",
    exclusive: true,
    conditions: ["24시간 영업", "늦게까지 영업"],
  },
  {
    title: "응대 경험",
    hint: "방문했을 때 느낀 응대 하나를 선택해 주세요.",
    exclusive: true,
    conditions: ["친절 경험", "불친절 경험"],
  },
  {
    title: "이용 안내",
    hint: "함께 적용될 수 있는 조건은 여러 개 고를 수 있어요.",
    exclusive: false,
    conditions: ["웨이팅 있는 곳", "노키즈존", "브레이크타임 있음", "예약 권장"],
  },
];

/** 저장해 둔 입력 등 외부 값에서 알려진 매장 이용 정보만 골라낼 때 씁니다. */
export function isVisitCondition(name: string): name is VisitCondition {
  return VISIT_CONDITIONS.some((condition) => condition === name);
}

export type Taster = {
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
  tasterFocus?: FoodFocus;
  activityScope?: ActivityScope;
  activityRegion?: string | null;
  intro?: string;
  subscriberCount?: number;
  placeCount?: number;
  /** 기록을 남긴 시각(ISO-8601). 샘플 기록과 브라우저에만 있는 이전 기록은 없습니다. */
  recordedAt?: string | null;
  profileTags?: string[];
  matchedTags?: string[];
  matchScore?: number;
  /** 같은 맛집 경험으로 쌓인 나와의 신뢰 %. 함께 다녀온 맛집이 없으면 null이고 취향 %를 대신 보여 줍니다. */
  trustScore?: number | null;
  trustLevel?: TrustLevel | null;
  visibility?: "PRIVATE" | "PUBLIC";
};

/**
 * 화면에 넘기는 장소 목록에서 내 기록의 tasterId입니다. app/enrichPlaces가 서버의 내 계정 ID를 이 값으로 바꿔 둡니다.
 * 서버 응답의 계정 ID까지 함께 판별해야 하면 useAppData().isMyTasterId를 씁니다.
 */
export const MY_TASTER_ID = "me";

/**
 * 직접 다녀온 곳만 기록·빠른 저장하도록 허용하는 현재 위치와 가게 사이 거리(m)입니다. 장소 서비스도 같은 값으로 확인합니다.
 * 안내 문구는 VISIT_RADIUS_LABEL을 써서 숫자를 바꿀 때 문구가 따로 남지 않게 합니다.
 */
export const VISIT_RADIUS_METERS = 1000;
export const VISIT_RADIUS_LABEL = `${VISIT_RADIUS_METERS / 1000}km`;

/** 화면용 장소 목록의 기록이 내 기록인지 확인합니다. */
export function isMyTaster(taster: Pick<Taster, "tasterId">): boolean {
  return taster.tasterId === MY_TASTER_ID;
}

/** 카페·디저트 계열 분류인지 확인합니다. 사진이 없을 때 커피 기호와 음식 기호를 고르는 데 씁니다. */
export function isCafeCategory(category?: string | null): boolean {
  return /카페|디저트|베이커리|간식|제과/.test(category ?? "");
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
  /** 저장할 때의 기기 위치. 새 기록이면 장소 서비스가 가게와 VISIT_RADIUS_METERS 안인지 다시 확인합니다(브라우저에 보관하지 않음). */
  deviceLocation?: { latitude: number; longitude: number } | null;
};

/**
 * 지도 마커 종류입니다. 맛객 핀: other·subscribed(발견), own(내 기록). 기호 마커(내 지도): liked(가볼 곳),
 * visited(기록 없이 다녀왔어요 하트), search(카카오에서 검색해 고른 가게).
 */
export type MapKind = "other" | "subscribed" | "liked" | "own" | "visited" | "search";
export type Screen =
  | "home"
  | "map"
  | "mymap"
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
  | "recent"
  | "feed"
  | "tasters"
  | "wallet"
  | "my-records"
  | "drafts"
  | "policy";

/**
 * 장소의 대표 사진입니다. 고른 기록(대표 맛객)의 사진 → 그 장소의 다른 기록 사진 → 내 사진(useAppData().photoFor) 순서이고,
 * 모두 없으면 undefined입니다(PlaceThumb가 음식 그림으로 채움).
 */
export function placePhoto(
  place: Pick<Place, "tasters">,
  record?: Pick<Taster, "photos">,
  myPhoto?: string,
): string | undefined {
  return (
    record?.photos?.find(Boolean) ??
    place.tasters.find((taster) => taster.photos?.length)?.photos?.find(Boolean) ??
    myPhoto
  );
}
