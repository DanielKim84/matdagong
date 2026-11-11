import { useMemo } from "react";
import { useAppData } from "../../app/AppData";
import type { Coordinates } from "../../utils/geo";
import {
  CAROUSEL_LIMIT,
  FILTER_TAG_GROUPS,
  isInBounds,
  matchesFilters,
  discoverPlaces,
  recentSubscribedRecords,
  scopedPlace,
  sortByUsage,
  sortPlaces,
  topCategories,
  type DiscoverFilters,
  type SortOrder,
  type VisibleBounds,
} from "./discoverModel";
import { usePlaceContext } from "./usePlaceContext";

const RECENT_LIMIT = 8;

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
  const { places, likedPlaceIds, dislikedPlaceIds, tasteTags } = useAppData();
  const ctx = usePlaceContext(device);
  // 가볼 곳으로 저장한 곳은 내 지도에서 보고, 별로였던 곳은 지도에서 빼므로 발견(지도·카드·목록)에는 보여 주지 않습니다.
  const allPlaces = useMemo(() => {
    const hidden = new Set([...likedPlaceIds, ...dislikedPlaceIds]);
    return discoverPlaces(places).filter((place) => !hidden.has(place.id));
  }, [places, likedPlaceIds, dislikedPlaceIds]);
  const filtered = useMemo(
    () =>
      allPlaces
        .filter((place) => matchesFilters(place, filters, ctx))
        .map((place) => scopedPlace(place, filters.scope, ctx)),
    [allPlaces, filters, ctx],
  );
  const categories = useMemo(() => topCategories(allPlaces), [allPlaces]);
  // 필터의 태그 묶음(여행·드라이브·뷰·분위기·이럴 때)은 사전의 태그를 이 근처에서 많이 쓰인 순으로 보여 줍니다.
  const tagSections = useMemo(
    () =>
      FILTER_TAG_GROUPS.map((group) => ({
        group,
        tags: sortByUsage(
          tasteTags.filter((tag) => tag.tagGroup === group).map((tag) => tag.name),
          allPlaces,
        ),
      })).filter((section) => section.tags.length > 0),
    [tasteTags, allPlaces],
  );

  // 카드는 지금 보는 지역의 장소입니다. 카드를 넘길 때 지도가 따라가도 기준 지역은 그대로라 카드가 뒤섞이지 않습니다.
  const carousel = sortPlaces(
    filtered.filter((place) => isInBounds(place, regionBounds)),
    "priority",
    ctx,
  ).slice(0, CAROUSEL_LIMIT);
  const focusedPlace = focusedId ? filtered.find((place) => place.id === focusedId) : undefined;
  if (focusedPlace && !carousel.includes(focusedPlace)) carousel.push(focusedPlace);
  const visible = filtered.filter((place) => isInBounds(place, bounds));

  return {
    ctx,
    filtered,
    carousel,
    rows: sortPlaces(visible, sort, ctx),
    // 목록 시트는 지금 지도에 보이는 지역 기준입니다. 구독한 맛객이 이 지역에 새로 올린 곳을 먼저 보여 줍니다.
    recentSubscribed: recentSubscribedRecords(visible, ctx, RECENT_LIMIT),
    categories,
    tagSections,
    countMatches: (next: DiscoverFilters) => allPlaces.filter((place) => matchesFilters(place, next, ctx)).length,
  };
}
