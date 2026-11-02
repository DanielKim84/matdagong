import { useMemo } from "react";
import { useAppData } from "../../app/AppData";
import type { Taster } from "../../models/place";
import type { Coordinates } from "../../utils/geo";
import {
  isInBounds,
  matchesFilters,
  mergePlaces,
  nearbyMatchedPlaces,
  recentSubscribedRecords,
  relocateSamples,
  sortPlaces,
  topCategories,
  topTags,
  type DiscoverFilters,
  type PlaceContext,
  type SortOrder,
  type VisibleBounds,
} from "./discoverModel";

const CAROUSEL_LIMIT = 30;
const RECENT_LIMIT = 8;
const NEARBY_LIMIT = 6;
const NEARBY_RADIUS_METERS = 1000;

/** 발견 화면의 지도·카드·목록 시트에 보일 장소를 조건에 맞춰 고르고 정렬합니다. */
export function useDiscoverPlaces({
  filters,
  sort,
  device,
  bounds,
  regionBounds,
  focusedId,
}: {
  filters: DiscoverFilters;
  sort: SortOrder;
  device: Coordinates | null;
  bounds: VisibleBounds | null;
  /** 카드 목록의 기준 지역. 사용자가 지도를 직접 옮겼을 때만 바뀝니다(카드 선택으로 지도가 따라갈 때는 그대로). */
  regionBounds: VisibleBounds | null;
  focusedId: string | null;
}) {
  const { subscriptionIds, likedPlaceIds, tasterById, places, privatePlaces, recommendedTasters } = useAppData();

  // 지도 마커는 장소 배열이 바뀔 때마다 다시 그려지므로, 카드 선택·지도 이동만으로는 새 배열을 만들지 않습니다.
  const ctx = useMemo<PlaceContext>(
    () => ({
      subscriptions: new Set(subscriptionIds),
      liked: new Set(likedPlaceIds),
      device,
      matchOf: (taster: Taster) => taster.matchScore ?? tasterById.get(taster.tasterId)?.matchScore ?? 0,
    }),
    [subscriptionIds, likedPlaceIds, tasterById, device],
  );
  const allPlaces = useMemo(
    () => relocateSamples(mergePlaces(places, privatePlaces), device),
    [places, privatePlaces, device],
  );
  const filtered = useMemo(
    () => allPlaces.filter((place) => matchesFilters(place, filters, ctx)),
    [allPlaces, filters, ctx],
  );
  const recommendedTasterIds = useMemo(() => recommendedTasters.map((taster) => taster.tasterId), [recommendedTasters]);
  const categories = useMemo(() => topCategories(allPlaces), [allPlaces]);
  const tags = useMemo(() => topTags(allPlaces), [allPlaces]);

  // 카드는 지금 보는 지역의 장소입니다. 카드를 넘길 때 지도가 따라가도 기준 지역은 그대로라 카드가 뒤섞이지 않습니다.
  const carousel = sortPlaces(
    filtered.filter((place) => isInBounds(place, regionBounds)),
    "priority",
    ctx,
  ).slice(0, CAROUSEL_LIMIT);
  const focusedPlace = focusedId ? filtered.find((place) => place.id === focusedId) : undefined;
  if (focusedPlace && !carousel.includes(focusedPlace)) carousel.push(focusedPlace);

  return {
    ctx,
    filtered,
    carousel,
    rows: sortPlaces(
      filtered.filter((place) => isInBounds(place, bounds)),
      sort,
      ctx,
    ),
    recentSubscribed: recentSubscribedRecords(filtered, ctx, RECENT_LIMIT),
    nearby: nearbyMatchedPlaces(filtered, ctx, NEARBY_RADIUS_METERS, NEARBY_LIMIT),
    categories,
    tags,
    recommendedTasterIds,
    countMatches: (next: DiscoverFilters) => allPlaces.filter((place) => matchesFilters(place, next, ctx)).length,
  };
}
