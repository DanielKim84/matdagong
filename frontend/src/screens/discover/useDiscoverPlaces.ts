import { useMemo } from "react";
import { useAppData } from "../../app/AppData";
import type { Coordinates } from "../../utils/geo";
import {
  FILTER_TAG_GROUPS,
  isInBounds,
  matchesFilters,
  discoverPlaces,
  scopedPlace,
  sortByUsage,
  sortPlaces,
  type DiscoverFilters,
  type SortOrder,
  type VisibleBounds,
} from "./discoverModel";
import { usePlaceContext } from "./usePlaceContext";

/** 발견 화면의 지도와 그 아래 목록에 보일 장소를 조건에 맞춰 고르고 정렬합니다. */
export function useDiscoverPlaces({
  filters,
  sort,
  device,
  bounds,
}: {
  filters: DiscoverFilters;
  sort: SortOrder;
  device: Coordinates | null;
  bounds: VisibleBounds | null;
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
  // 음식 종류는 취향 설정·기록하기와 같은 사전 순서를 씁니다. 장소 제공처의 세부 분류는 필터로 노출하지 않습니다.
  const cuisineOptions = useMemo(
    () => tasteTags.filter((tag) => tag.tagGroup === "CUISINE").map((tag) => tag.name),
    [tasteTags],
  );
  // 필터의 나머지 태그 묶음(여행·드라이브·뷰·분위기·이럴 때)은 이 지역에서 많이 쓰인 순으로 보여 줍니다.
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

  const visible = filtered.filter((place) => isInBounds(place, bounds));

  return {
    ctx,
    filtered,
    /** 지금 지도에 보이는 곳(지도 목록) */
    rows: sortPlaces(visible, sort, ctx),
    /** 지도와 상관없이 조건에 맞는 곳 전부(검색 결과 목록, 보드 05-01) */
    allRows: sortPlaces(filtered, sort, ctx),
    cuisineOptions,
    tagSections,
  };
}
