import { isMyTaster, placeNeighborhood, type Place, type Taster, type VisitCondition } from "../../models/place";
import type { TasteTagGroup } from "../../models/tasteTags";
import type { TasteTag } from "../../models/community";
import { compareByTrust, isTrustedTaster } from "../../models/trust";
import { categoryLabel, formatDistance } from "../../utils/format";
import { distanceMeters, type Coordinates } from "../../utils/geo";

/**
 * 발견 화면(DiscoverScreen)의 필터·정렬·대표 맛객 고르기 계산입니다. 내 지도도 범위·정렬·대표 맛객 계산을 함께 씁니다.
 * React 없이 장소 목록만 다룹니다.
 * 탭 저장소에 남기는 화면 상태(고른 조건·정렬)는 discoverStorage.ts가 맡습니다.
 */

/** 상단 칩의 "누구의 기록" 범위입니다. 내 기록·하트한 곳은 발견이 아니라 내 지도 탭에서 봅니다. */
type Scope = "all" | "subscribed" | "unsubscribed";
export type SortOrder = "priority" | "distance";
/** 지도 아래 카드에 한 번에 보여 줄 최대 장소 수입니다(발견·내 지도). */
/** 지도에 보이는 영역(위도·경도) */
export type VisibleBounds = { south: number; west: number; north: number; east: number };

export type DiscoverFilters = {
  scope: Scope;
  /** 취향 사전의 큰 음식 종류 태그 하나. 빈 문자열이면 전체 */
  cuisine: string;
  /** 맛객 기록의 탐색 태그(여행·드라이브·뷰·분위기·이럴 때). 모두 맞아야 보입니다. */
  tags: string[];
  /** 방문해 확인한 매장 정보. 모두 맞아야 보입니다. */
  conditions: VisitCondition[];
};

export const DEFAULT_FILTERS: DiscoverFilters = { scope: "all", cuisine: "", tags: [], conditions: [] };

/** label은 발견 위쪽 칩(보드 06-01), sheetLabel은 필터 화면 "맛객 관계"(보드 05-03)의 이름입니다. */
export const SCOPE_OPTIONS: { value: Scope; label: string; sheetLabel: string }[] = [
  { value: "all", label: "전체", sheetLabel: "전체" },
  { value: "subscribed", label: "구독", sheetLabel: "구독" },
  { value: "unsubscribed", label: "구독 안 한", sheetLabel: "구독 안 함" },
];

/**
 * 필터로 고를 만한 매장 이용 정보입니다. 찾아갈 이유가 되는 것만 두고, 피하는 조건(주차 불가·노키즈존·불친절 등)은
 * 거르기 조건으로 쓰지 않습니다(그건 추천 취향의 "피하고 싶은 조건"이 맡음).
 */
export const FILTER_CONDITIONS: VisitCondition[] = [
  "주차 편리",
  "예약 권장",
  "늦게까지 영업",
  "24시간 영업",
  "반려동물 동반",
  "아이 의자 있음",
  "단체석·룸",
  "테라스·야외석",
  "포장 가능",
  "친절 경험",
];

/** 음식 종류는 별도 한 칸으로 고르고, 나머지 탐색 태그는 시트의 묶음으로 보여 줍니다. */
export const FILTER_TAG_GROUPS: readonly TasteTagGroup[] = ["TRAVEL", "MOOD", "OCCASION"];

/** 이전 필터 이름이 세션에 남아 있으면 현재 취향 사전에 있는 선택만 살립니다. */
export function normalizeDiscoverFilters(filters: DiscoverFilters, tasteTags: TasteTag[]): DiscoverFilters {
  if (!tasteTags.length) return filters;
  const cuisineNames = new Set(tasteTags.filter((tag) => tag.tagGroup === "CUISINE").map((tag) => tag.name));
  const exploreNames = new Set(
    tasteTags.filter((tag) => FILTER_TAG_GROUPS.includes(tag.tagGroup)).map((tag) => tag.name),
  );
  const cuisine = cuisineNames.has(filters.cuisine) ? filters.cuisine : "";
  const tags = filters.tags.filter((tag) => exploreNames.has(tag));
  return cuisine === filters.cuisine && tags.length === filters.tags.length ? filters : { ...filters, cuisine, tags };
}

/** 화면이 장소를 판단할 때 쓰는 계정 관계입니다. */
export type PlaceContext = {
  subscriptions: Set<string>;
  device: Coordinates | null;
  matchOf: (taster: Taster) => number;
};

/**
 * 발견은 새 맛집을 찾는 곳이라 다른 맛객의 기록만 보여 줍니다. 장소에서 내 기록을 빼고, 다른 맛객 기록이 없는 곳(내 기록·하트만 있는 곳)은 뺍니다.
 * 내 기록·다녀온 곳·가볼 곳은 내 지도 탭이 보여 줍니다.
 */
export function discoverPlaces(places: Place[]): Place[] {
  return places
    .map((place) => {
      const tasters = place.tasters.filter((taster) => !isMyTaster(taster));
      return tasters.length === place.tasters.length ? place : { ...place, tasters, recordCount: tasters.length };
    })
    .filter((place) => place.tasters.length > 0);
}

function isSubscribedPlace(place: Place, ctx: PlaceContext): boolean {
  return place.tasters.some((taster) => ctx.subscriptions.has(taster.tasterId));
}

/** 아직 구독하지 않은 맛객(구독하지 않은 신뢰 맛객 포함)의 기록이 있는 장소입니다. 내 기록만 있는 곳은 빠집니다. */
function isUnsubscribedPlace(place: Place, ctx: PlaceContext): boolean {
  return place.tasters.some((taster) => !isMyTaster(taster) && !ctx.subscriptions.has(taster.tasterId));
}

/**
 * 범위(구독·구독 안 한)를 골랐을 때 장소의 맛객을 그 범위의 맛객만 남깁니다. 한 장소를 구독한 맛객과 구독하지 않은 맛객이
 * 함께 기록했어도, "구독 안 한"에서는 카드·목록이 구독하지 않은 맛객으로 그려지고 반대도 마찬가지입니다.
 * 전체는 그대로 둡니다. 맛집 상세는 이와 상관없이 모든 맛객 기록을 보여 줍니다.
 */
export function scopedPlace(place: Place, scope: Scope, ctx: PlaceContext): Place {
  const isInScope =
    scope === "subscribed"
      ? (taster: Taster) => ctx.subscriptions.has(taster.tasterId)
      : scope === "unsubscribed"
        ? (taster: Taster) => !ctx.subscriptions.has(taster.tasterId)
        : null;
  if (!isInScope) return place;
  const tasters = place.tasters.filter(isInScope);
  // 카드의 "추천한 맛객 N명"은 이 범위의 맛객 수로 맞춥니다.
  return { ...place, tasters, recordCount: tasters.length };
}

/** 추천순 정렬에만 씁니다. 필터와 지도 핀은 취향 %로 나누지 않습니다. */
function isMatchedPlace(place: Place, ctx: PlaceContext): boolean {
  return place.tasters.some((taster) => !isMyTaster(taster) && ctx.matchOf(taster) > 0);
}

/** 믿고 가는 맛객(신뢰 등급이 있는 맛객)이 기록한 장소인지 확인합니다. */
function isTrustedPlace(place: Place): boolean {
  return place.tasters.some((taster) => !isMyTaster(taster) && isTrustedTaster(taster));
}

function placeTags(place: Place): string[] {
  return [
    ...new Set(
      place.tasters
        .flatMap((taster) => taster.tags ?? [])
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

function placeConditions(place: Place): VisitCondition[] {
  return [
    ...new Set([...(place.visitConditions ?? []), ...place.tasters.flatMap((taster) => taster.visitConditions ?? [])]),
  ];
}

function distanceTo(place: Place, ctx: PlaceContext): number | null {
  return ctx.device ? distanceMeters(ctx.device, place) : null;
}

/** 목록·카드의 "음식 종류 · 거리 · 동네" 한 줄입니다(보드 05-01). */
export function placeSummary(place: Place, ctx: PlaceContext): string {
  return [categoryLabel(place.category), formatDistance(distanceTo(place, ctx)), placeNeighborhood(place)]
    .filter(Boolean)
    .join(" · ");
}

/** 범위를 아직 모르면(null) 모든 장소를 안에 있는 것으로 봅니다. */
export function isInBounds(place: Place, bounds: VisibleBounds | null): boolean {
  return (
    !bounds ||
    (place.latitude >= bounds.south &&
      place.latitude <= bounds.north &&
      place.longitude >= bounds.west &&
      place.longitude <= bounds.east)
  );
}

export function matchesFilters(place: Place, filters: DiscoverFilters, ctx: PlaceContext): boolean {
  if (filters.scope === "subscribed" && !isSubscribedPlace(place, ctx)) return false;
  if (filters.scope === "unsubscribed" && !isUnsubscribedPlace(place, ctx)) return false;
  const scoped = scopedPlace(place, filters.scope, ctx);
  if (filters.cuisine && !placeTags(scoped).includes(filters.cuisine)) return false;
  if (filters.tags.length) {
    const tags = placeTags(scoped);
    if (!filters.tags.every((tag) => tags.includes(tag))) return false;
  }
  if (filters.conditions.length) {
    const conditions = placeConditions(scoped);
    if (!filters.conditions.every((condition) => conditions.includes(condition))) return false;
  }
  return true;
}

/** 믿고 가는 맛객 → 구독 → 취향 맞는 맛객 → 그 밖의 순서입니다. */
function priorityOf(place: Place, ctx: PlaceContext): number {
  if (isTrustedPlace(place)) return 0;
  if (isSubscribedPlace(place, ctx)) return 1;
  if (isMatchedPlace(place, ctx)) return 2;
  return 3;
}

/** 대표 맛객의 점수(신뢰 %가 있으면 그것, 없으면 취향 %)입니다. 추천순에서 같은 단계끼리 비교할 때 씁니다. */
function leadScoreOf(place: Place, ctx: PlaceContext): number {
  const lead = leadTaster(place, ctx);
  if (!lead || isMyTaster(lead)) return 0;
  return lead.trustScore ?? ctx.matchOf(lead);
}

/**
 * 추천순은 우선순위(믿고 가는 맛객 → 구독 → 취향 맞음) → 대표 맛객 점수 → 기록 수 → 가까운 곳 순이고,
 * 가까운 순은 거리만 봅니다(내 위치를 모르면 추천순). 같은 단계 안에서 거리를 먼저 보면 두 정렬이 똑같아 보여 점수·기록 수를 먼저 봅니다.
 */
export function sortPlaces(list: Place[], order: SortOrder, ctx: PlaceContext): Place[] {
  const distance = (place: Place) => distanceTo(place, ctx) ?? Number.POSITIVE_INFINITY;
  return [...list].sort((left, right) => {
    if (order === "distance" && ctx.device) return distance(left) - distance(right);
    return (
      priorityOf(left, ctx) - priorityOf(right, ctx) ||
      leadScoreOf(right, ctx) - leadScoreOf(left, ctx) ||
      right.recordCount - left.recordCount ||
      (ctx.device ? distance(left) - distance(right) : 0)
    );
  });
}

/** 카드에 대표로 보여 줄 맛객: 가장 믿는 맛객 → 구독한 맛객 → 취향이 가장 맞는 맛객 → 다른 맛객 → 나. */
export function leadTaster(place: Place, ctx: PlaceContext): Taster | undefined {
  const others = place.tasters.filter((taster) => !isMyTaster(taster));
  return (
    [...others].sort(compareByTrust).find(isTrustedTaster) ??
    others.find((taster) => ctx.subscriptions.has(taster.tasterId)) ??
    [...others]
      .sort((left, right) => ctx.matchOf(right) - ctx.matchOf(left))
      .find((taster) => ctx.matchOf(taster) > 0) ??
    others[0] ??
    place.tasters[0]
  );
}

/** 같은 맛객(tasterId)은 첫 기록만 남깁니다(얼굴 겹치기·"외 N명" 수). */
export function uniqueTasters(place: Place): Taster[] {
  return place.tasters.filter(
    (taster, index, list) => list.findIndex((other) => other.tasterId === taster.tasterId) === index,
  );
}

/** 사전 순서의 태그 이름을 이 장소들에서 많이 쓰인 순으로 다시 놓습니다. 쓰인 수가 같으면 사전 순서를 지킵니다. */
export function sortByUsage(names: string[], places: Place[]): string[] {
  const counts = new Map<string, number>();
  places.flatMap(placeTags).forEach((tag) => counts.set(tag, (counts.get(tag) ?? 0) + 1));
  return [...names].sort((left, right) => (counts.get(right) ?? 0) - (counts.get(left) ?? 0));
}

/** 범위(상단 칩)를 뺀 세부 조건 수입니다. */
export function detailFilterCount(filters: DiscoverFilters): number {
  return (filters.cuisine ? 1 : 0) + filters.tags.length + filters.conditions.length;
}
