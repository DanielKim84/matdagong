import type { Place, Taster, VisitCondition } from "../../models/place";
import { distanceMeters, type Coordinates } from "../../utils/geo";

/** 상단 칩의 "누구의 기록" 범위입니다. */
export type Scope = "all" | "subscribed" | "matched" | "saved";
/** 내 위치에서의 거리 제한(m). 0이면 제한 없음. */
export type DistanceLimit = 0 | 500 | 1000 | 3000;
export type SortOrder = "priority" | "distance";
export type SheetState = "peek" | "half" | "full";

export type DiscoverFilters = {
  scope: Scope;
  /** 음식 종류(장소 분류의 마지막 단계). 빈 문자열이면 전체 */
  category: string;
  distance: DistanceLimit;
  /** 맛객 기록 태그(혼밥·데이트 등). 모두 맞아야 보입니다. */
  tags: string[];
  /** 방문해 확인한 매장 정보. 모두 맞아야 보입니다. */
  conditions: VisitCondition[];
};

export const DEFAULT_FILTERS: DiscoverFilters = { scope: "all", category: "", distance: 0, tags: [], conditions: [] };

export const SCOPE_OPTIONS: { value: Scope; label: string; sheetLabel: string }[] = [
  { value: "all", label: "전체", sheetLabel: "전체 맛객" },
  { value: "subscribed", label: "구독", sheetLabel: "구독한 맛객" },
  { value: "matched", label: "취향 맞는", sheetLabel: "취향 맞는 맛객" },
  { value: "saved", label: "내 저장", sheetLabel: "내 저장" },
];

export const DISTANCE_OPTIONS: { value: DistanceLimit; label: string }[] = [
  { value: 500, label: "500m" },
  { value: 1000, label: "1km" },
  { value: 3000, label: "3km" },
  { value: 0, label: "전체" },
];

/** 필터로 고를 만한 매장 정보입니다. 부정적인 경험(불친절 등)은 거르기 조건으로 쓰지 않습니다. */
export const FILTER_CONDITIONS: VisitCondition[] = ["주차 편리", "늦게까지 영업", "24시간 영업", "친절 경험", "예약 권장"];

/** 화면이 장소를 판단할 때 쓰는 계정 관계입니다. */
export type PlaceContext = {
  subscriptions: Set<string>;
  liked: Set<string>;
  device: Coordinates | null;
  matchOf: (taster: Taster) => number;
};

/** 공개 목록과 내 비공개 기록을 같은 장소 ID로 합쳐 내 기록도 함께 표시합니다. */
export function mergePlaces(places: Place[], privatePlaces: Place[]): Place[] {
  const byId = new Map<string, Place>();
  [...places, ...privatePlaces].forEach((place) => {
    const existing = byId.get(place.id);
    if (!existing) {
      byId.set(place.id, place);
      return;
    }
    const authors = new Map(existing.tasters.map((taster) => [taster.tasterId, taster]));
    place.tasters.forEach((taster) => authors.set(taster.tasterId, taster));
    byId.set(place.id, {
      ...existing,
      ...place,
      recordCount: Math.max(existing.recordCount, place.recordCount),
      visitConditions: [...new Set([...(existing.visitConditions ?? []), ...(place.visitConditions ?? [])])],
      tasters: [...authors.values()],
    });
  });
  return [...byId.values()];
}

/**
 * 장소 서비스의 개발용 샘플 장소(p-001 등)는 서로의 간격을 유지한 채 현재 위치 주변으로 옮겨 보여줍니다.
 * 기준점(37.5642, 126.9254)은 샘플 장소가 모여 있는 연남동 부근으로, 지도 기본 중심과 같습니다.
 */
export function relocateSamples(places: Place[], device: Coordinates | null): Place[] {
  if (!device) return places;
  return places.map((place) => /^p-\d+$/.test(place.id)
    ? {
      ...place,
      latitude: device.latitude + (place.latitude - 37.5642),
      longitude: device.longitude + (place.longitude - 126.9254),
    }
    : place);
}

export function categoryLabel(place: Place): string {
  return place.category.split(">").pop()?.trim() || "맛집";
}

export const isMine = (taster: Taster) => taster.tasterId === "me";

export function isSubscribedPlace(place: Place, ctx: PlaceContext): boolean {
  return place.tasters.some((taster) => ctx.subscriptions.has(taster.tasterId));
}

export function isMatchedPlace(place: Place, ctx: PlaceContext): boolean {
  return place.tasters.some((taster) => !isMine(taster) && ctx.matchOf(taster) > 0);
}

export function isSavedPlace(place: Place, ctx: PlaceContext): boolean {
  return ctx.liked.has(place.id) || place.tasters.some(isMine);
}

export function placeTags(place: Place): string[] {
  return [...new Set(place.tasters.flatMap((taster) => taster.tags ?? []).map((tag) => tag.trim()).filter(Boolean))];
}

export function placeConditions(place: Place): VisitCondition[] {
  return [...new Set([...(place.visitConditions ?? []), ...place.tasters.flatMap((taster) => taster.visitConditions ?? [])])];
}

export function distanceTo(place: Place, ctx: PlaceContext): number | null {
  return ctx.device ? distanceMeters(ctx.device, place) : null;
}

export function matchesFilters(place: Place, filters: DiscoverFilters, ctx: PlaceContext): boolean {
  // 리뉴얼 발견 화면은 광고 대신 맛객 기록만 보여 줍니다.
  if (place.advertisement) return false;
  if (filters.scope === "subscribed" && !isSubscribedPlace(place, ctx)) return false;
  if (filters.scope === "matched" && !isMatchedPlace(place, ctx)) return false;
  if (filters.scope === "saved" && !isSavedPlace(place, ctx)) return false;
  if (filters.category && categoryLabel(place) !== filters.category) return false;
  if (filters.distance && ctx.device && distanceMeters(ctx.device, place) > filters.distance) return false;
  if (filters.tags.length) {
    const tags = placeTags(place);
    if (!filters.tags.every((tag) => tags.includes(tag))) return false;
  }
  if (filters.conditions.length) {
    const conditions = placeConditions(place);
    if (!filters.conditions.every((condition) => conditions.includes(condition))) return false;
  }
  return true;
}

/** 구독 → 취향 맞는 맛객 → 그 밖의 순서입니다. */
export function priorityOf(place: Place, ctx: PlaceContext): number {
  if (isSubscribedPlace(place, ctx)) return 0;
  if (isMatchedPlace(place, ctx)) return 1;
  return 2;
}

export function sortPlaces(list: Place[], order: SortOrder, ctx: PlaceContext): Place[] {
  const distance = (place: Place) => distanceTo(place, ctx) ?? Number.POSITIVE_INFINITY;
  return [...list].sort((left, right) => {
    if (order === "distance" && ctx.device) return distance(left) - distance(right);
    return priorityOf(left, ctx) - priorityOf(right, ctx)
      || (ctx.device ? distance(left) - distance(right) : 0)
      || right.recordCount - left.recordCount;
  });
}

/** 카드에 대표로 보여 줄 맛객: 구독한 맛객 → 취향이 가장 맞는 맛객 → 다른 맛객 → 나. */
export function leadTaster(place: Place, ctx: PlaceContext): Taster | undefined {
  const others = place.tasters.filter((taster) => !isMine(taster));
  return others.find((taster) => ctx.subscriptions.has(taster.tasterId))
    ?? [...others].sort((left, right) => ctx.matchOf(right) - ctx.matchOf(left)).find((taster) => ctx.matchOf(taster) > 0)
    ?? others[0]
    ?? place.tasters[0];
}

export function uniqueTasters(place: Place): Taster[] {
  return place.tasters.filter((taster, index, list) =>
    list.findIndex((other) => other.tasterId === taster.tasterId) === index);
}

export function placePhoto(place: Place, lead: Taster | undefined, fallback?: string): string | undefined {
  return lead?.photos?.[0] ?? place.tasters.find((taster) => taster.photos?.length)?.photos?.[0] ?? fallback;
}

export function formatDistance(meters: number | null): string {
  if (meters === null) return "";
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)}km`;
}

/** 목록에서 많이 쓰인 값부터 고릅니다. */
function mostUsed(values: string[], limit: number): string[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((left, right) => right[1] - left[1]).slice(0, limit).map(([value]) => value);
}

export function topCategories(places: Place[], limit = 8): string[] {
  return mostUsed(places.filter((place) => !place.advertisement).map(categoryLabel), limit);
}

export function topTags(places: Place[], limit = 8): string[] {
  return mostUsed(places.filter((place) => !place.advertisement).flatMap(placeTags), limit);
}

/** 범위(상단 칩)를 뺀 세부 조건 수입니다. */
export function detailFilterCount(filters: DiscoverFilters): number {
  return (filters.category ? 1 : 0) + (filters.distance ? 1 : 0) + filters.tags.length + filters.conditions.length;
}

const STORAGE_KEY = "matdagong.discover.state";
type Stored = { filters: DiscoverFilters; sheet: SheetState; sort: SortOrder };

/** 상세 화면을 다녀와도 고른 조건과 시트 높이를 유지합니다. */
export function loadStoredState(): Stored {
  const fallback: Stored = { filters: DEFAULT_FILTERS, sheet: "peek", sort: "priority" };
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "null") as Partial<Stored> | null;
    if (!parsed) return fallback;
    const filters = { ...DEFAULT_FILTERS, ...parsed.filters };
    return {
      filters: {
        scope: SCOPE_OPTIONS.some((option) => option.value === filters.scope) ? filters.scope : "all",
        category: typeof filters.category === "string" ? filters.category : "",
        distance: DISTANCE_OPTIONS.some((option) => option.value === filters.distance) ? filters.distance : 0,
        tags: Array.isArray(filters.tags) ? filters.tags.filter((tag) => typeof tag === "string") : [],
        conditions: Array.isArray(filters.conditions) ? filters.conditions.filter((item) => FILTER_CONDITIONS.includes(item)) : [],
      },
      sheet: parsed.sheet === "half" || parsed.sheet === "full" ? parsed.sheet : "peek",
      sort: parsed.sort === "distance" ? "distance" : "priority",
    };
  } catch {
    return fallback;
  }
}

export function saveStoredState(state: Stored) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // 저장소를 쓸 수 없어도 화면은 그대로 동작합니다.
  }
}
