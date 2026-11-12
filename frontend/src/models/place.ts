/** 지도·목록·상세가 함께 쓰는 장소와 맛객 기록 자료형, 그리고 화면 주소(#화면) 목록입니다. */
import type { ActivityScope, FoodFocus } from "./community";
import type { TrustLevel } from "./trust";

/** 장소 정보 제공처 코드입니다. 지금은 카카오 장소만 고릅니다. 장소 서비스 PlaceIdentifiers.KAKAO와 같은 값입니다. */
export const KAKAO_PROVIDER_CODE = "KAKAO";

/** 장소 서비스 PlaceView와 같은 모양입니다(기록 작성자 사진·캐릭터만 app/enrichPlaces가 채움). */
export type Place = {
  id: string;
  /** 장소 정보 제공처입니다(KAKAO_PROVIDER_CODE). */
  providerCode: string;
  /** 제공처의 장소 ID(카카오 장소 ID). 같은 가게의 맛객 기록을 하나의 장소로 묶는 기준입니다. */
  providerPlaceId: string;
  roadAddress: string | null;
  lotAddress: string | null;
  providerPhone: string | null;
  providerUrl: string | null;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  /** 보이는 기록 수. 발견에서 기록을 거르면 화면이 남은 기록 수로 바꿉니다. */
  recordCount: number;
  /** 기록들의 매장 이용 정보를 합친 목록입니다. */
  visitConditions?: VisitCondition[];
  /** 맛객별 기록(최신순). 첫 기록이 카드의 대표 한마디입니다. */
  tasters: Taster[];
};

/**
 * 맛객이 직접 다녀와 확인한 매장 이용 정보입니다. 커뮤니티 DB의 VISIT 태그 이름(V39)과 반드시 같아야 합니다.
 * app/enrichPlaces가 내 "피하고 싶은 조건"(VISIT 태그)과 기록의 매장 이용 정보를 이름으로 비교하기 때문입니다.
 * 기록하기에서 하나만 고르는 묶음을 나누려고 화면에도 이름을 둡니다. 장소 서비스 PlaceRecordModels.VISIT_CONDITIONS와
 * 함께 고칩니다.
 */
const VISIT_CONDITIONS = [
  "주차 편리",
  "주차 공간 협소",
  "주차 불가",
  "예약 권장",
  "웨이팅 있는 곳",
  "브레이크타임 있음",
  "늦게까지 영업",
  "24시간 영업",
  "반려동물 동반",
  "노키즈존",
  "아이 의자 있음",
  "단체석·룸",
  "테라스·야외석",
  "포장 가능",
  "친절 경험",
  "불친절 경험",
] as const;
export type VisitCondition = (typeof VISIT_CONDITIONS)[number];

/** 매장 이용 정보는 주제별로 묶고, 서로 반대되는 상태만 한 항목 안에서 하나 고릅니다. */
export const VISIT_CONDITION_GROUPS: {
  title: string;
  isExclusive: boolean;
  conditions: VisitCondition[];
}[] = [
  { title: "주차", isExclusive: true, conditions: ["주차 편리", "주차 공간 협소", "주차 불가"] },
  { title: "영업 시간", isExclusive: true, conditions: ["늦게까지 영업", "24시간 영업"] },
  { title: "응대 경험", isExclusive: true, conditions: ["친절 경험", "불친절 경험"] },
  {
    title: "이용 안내",
    isExclusive: false,
    conditions: ["예약 권장", "웨이팅 있는 곳", "브레이크타임 있음", "포장 가능"],
  },
  {
    title: "함께 가기",
    isExclusive: false,
    conditions: ["반려동물 동반", "노키즈존", "아이 의자 있음", "단체석·룸", "테라스·야외석"],
  },
];

/** 추천 취향의 "피하고 싶은 조건"으로 고를 수 있는 매장 이용 정보입니다. 화면에서만 거릅니다. */
export const AVOIDABLE_VISIT_CONDITIONS: readonly VisitCondition[] = [
  "주차 공간 협소",
  "주차 불가",
  "웨이팅 있는 곳",
  "브레이크타임 있음",
  "노키즈존",
  "불친절 경험",
];

/** 저장해 둔 입력 등 외부 값에서 알려진 매장 이용 정보만 골라낼 때 씁니다. */
export function isVisitCondition(name: string): name is VisitCondition {
  return VISIT_CONDITIONS.some((condition) => condition === name);
}

export type Taster = {
  tasterId: string;
  tasterName: string;
  /**
   * 맛객 사진 주소(없으면 빈 문자열)와 기본 캐릭터 번호입니다. 장소 응답에는 없어 app/enrichPlaces가 커뮤니티 프로필로
   * 채웁니다.
   */
  avatar: string;
  avatarVariant: number;
  note: string;
  menus?: RecommendedMenu[];
  photos?: string[];
  tags?: string[];
  tagGroups?: Record<string, string>;
  visitConditions?: VisitCondition[];
  /** 커뮤니티 프로필의 배경 사진 주소(올린 순서). 장소 응답의 기록에는 없습니다. */
  profileCoverUrls?: string[];
  tasterFocus?: FoodFocus;
  activityScope?: ActivityScope;
  activityRegion?: string | null;
  intro?: string;
  subscriberCount?: number;
  /** 기록을 남긴 시각(ISO-8601). 커뮤니티 프로필로 만든 맛객에는 없습니다. */
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
 * 직접 다녀온 곳만 기록·빠른 저장하도록 허용하는 현재 위치와 가게 사이 거리(m)입니다. 장소 서비스
 * NearbyPlaceGuard.MAX_VISIT_DISTANCE_METERS와 같은 값으로 함께 바꿉니다.
 * 안내 문구(약관 포함)는 VISIT_RADIUS_LABEL을 써서 숫자를 바꿀 때 문구가 따로 남지 않게 합니다.
 */
export const VISIT_RADIUS_METERS = 1000;
export const VISIT_RADIUS_LABEL = `${VISIT_RADIUS_METERS / 1000}km`;

/** 맛다공 장소가 카카오 검색에서 고른 가게(카카오 장소 ID)와 같은 곳인지 확인합니다. */
export function isSameKakaoPlace(
  place: Pick<Place, "providerCode" | "providerPlaceId">,
  kakaoPlaceId: string,
): boolean {
  return place.providerCode === KAKAO_PROVIDER_CODE && place.providerPlaceId === kakaoPlaceId;
}

/** 화면용 장소 목록의 기록이 내 기록인지 확인합니다. */
export function isMyTaster(taster: Pick<Taster, "tasterId">): boolean {
  return taster.tasterId === MY_TASTER_ID;
}

/** 카페·디저트 계열 분류인지 확인합니다. 사진이 없을 때 커피 기호와 음식 기호를 고르는 데 씁니다. */
export function isCafeCategory(category?: string | null): boolean {
  return /카페|디저트|베이커리|간식|제과/.test(category ?? "");
}

/**
 * 맛객이 직접 추천한 메뉴명과 가격입니다. 가격을 모르면 비워 둘 수 있습니다. 서버는 가격·사진이 없으면 null을 보내므로
 * 읽는 쪽은 값이 있는지만 봅니다(=== undefined로 비교하지 않음).
 */
export type RecommendedMenu = { name: string; price?: number; photo?: string };

/** 기록하기가 저장할 때 보내는 새 기록입니다(recordPayload.buildNewPlace가 만듦). */
export type NewPlace = {
  providerCode: string;
  providerPlaceId: string;
  roadAddress?: string;
  lotAddress?: string;
  providerPhone?: string;
  providerUrl?: string;
  name: string;
  category: string;
  address: string;
  latitude: number;
  longitude: number;
  reason: string;
  menus: RecommendedMenu[];
  tags: string[];
  tagGroups: Record<string, string>;
  visitConditions: VisitCondition[];
  photos: string[];
  visibility: "private" | "public";
  /** 저장할 때의 기기 위치. 새 기록이면 장소 서비스가 가게와 VISIT_RADIUS_METERS 안인지 다시 확인합니다(브라우저에 보관하지 않음). */
  deviceLocation?: { latitude: number; longitude: number } | null;
};

/**
 * 지도 마커 종류입니다. 맛객 핀: other·subscribed(발견), own(내 기록). 기호 마커(내 지도): liked(가볼 곳),
 * visited(기록 없는 다녀온 곳: 빠른 저장했거나 기록을 지운 곳).
 */
export type MapKind = "other" | "subscribed" | "liked" | "own" | "visited";
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
  | "recent"
  | "feed"
  | "tasters"
  | "wallet"
  | "drafts"
  | "disliked"
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
