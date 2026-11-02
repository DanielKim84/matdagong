import { useEffect, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import MapCanvas from "../../components/MapCanvas";
import { EmptyState, Skeleton, type EmptyStateProps } from "../../components/ui";
import type { Place } from "../../models/place";
import type { Coordinates } from "../../utils/geo";
import DiscoverSearchPanel from "./DiscoverSearchPanel";
import DiscoverSheet from "./DiscoverSheet";
import DiscoverSheetList from "./DiscoverSheetList";
import FilterSheet from "./FilterSheet";
import MarkerGuideSheet from "./MarkerGuideSheet";
import PlaceCarousel from "./PlaceCarousel";
import {
  DEFAULT_FILTERS,
  detailFilterCount,
  loadStoredState,
  saveStoredState,
  type DiscoverFilters,
  type SheetState,
  type SortOrder,
  type VisibleBounds,
} from "./discoverModel";
import { useDiscoverPlaces } from "./useDiscoverPlaces";
import { useSheetHeights } from "./useSheetHeights";

/** 발견 탭(앱 첫 화면): 화면 가득 지도, 넘기는 장소 카드, 끌어 올리는 목록 시트. */
export default function DiscoverScreen() {
  const app = useAppData();
  const [stored] = useState(loadStoredState);
  const [filters, setFilters] = useState<DiscoverFilters>(stored.filters);
  const [sheet, setSheet] = useState<SheetState>(stored.sheet);
  const [sort, setSort] = useState<SortOrder>(stored.sort);
  const [device, setDevice] = useState<Coordinates | null>(null);
  const [bounds, setBounds] = useState<VisibleBounds | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMarkerGuideOpen, setIsMarkerGuideOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const { heights, style } = useSheetHeights(root, top);
  const {
    ctx,
    filtered,
    carousel,
    rows,
    recentSubscribed,
    nearby,
    categories,
    tags,
    recommendedTasterIds,
    countMatches,
  } = useDiscoverPlaces({ filters, sort, device, bounds, focusedId });

  useEffect(() => saveStoredState({ filters, sheet, sort }), [filters, sheet, sort]);

  const hasFilterChanges = filters.scope !== "all" || detailFilterCount(filters) > 0;
  const isFirstLoad = app.loading && !app.places.length;

  function selectFromMap(place: Place) {
    // 이미 고른 핀을 다시 누르면 상세로, 처음 누르면 카드로 보여 줍니다.
    if (focusedId === place.id) {
      go("place", place.id);
      return;
    }
    setFocusedId(place.id);
    setSheet("peek");
  }
  function changeFilters(next: DiscoverFilters) {
    setFilters(next);
    setFocusedId(null);
  }

  // 목록 대신 보여 줄 오류·빈 화면입니다. 카드 자리와 시트에 같은 내용을 씁니다.
  let fallback: EmptyStateProps | null = null;
  if (app.error && !app.places.length) {
    fallback = {
      tone: "error",
      title: "맛집을 불러오지 못했어요",
      message: app.error,
      action: { label: "다시 불러오기", onClick: app.actions.retry },
    };
  } else if (!isFirstLoad && !filtered.length) {
    fallback = app.query
      ? {
          title: `‘${app.query}’ 검색 결과가 없어요`,
          message: "맛집 이름이나 음식 종류, 동네 이름으로 다시 찾아보세요.",
          action: { label: "검색어 지우기", onClick: () => app.setQuery("") },
        }
      : hasFilterChanges
        ? {
            title: "조건에 맞는 맛객 기록이 없어요",
            message: "필터를 줄이면 더 많은 곳을 볼 수 있어요.",
            action: { label: "조건 초기화", onClick: () => changeFilters(DEFAULT_FILTERS) },
          }
        : {
            title: "아직 맛객 기록이 없어요",
            message: "다녀온 맛집을 기록하면 지도에 바로 나타나요.",
            action: { label: "첫 기록 남기기", onClick: () => go("register") },
          };
  }
  const fallbackView = fallback && <EmptyState {...fallback} className="r-discover-empty" />;

  return (
    <main ref={root} className="r-screen r-discover" data-sheet={sheet} style={style}>
      <div className="r-discover__map">
        <MapCanvas
          places={filtered}
          subscriptions={app.subscriptionIds}
          liked={app.likedPlaceIds}
          recommendedTasterIds={recommendedTasterIds}
          focusedPlaceId={focusedId}
          onPositionChange={setDevice}
          onBoundsChange={(next) => {
            const southWest = next.getSouthWest();
            const northEast = next.getNorthEast();
            setBounds({
              south: southWest.getLat(),
              west: southWest.getLng(),
              north: northEast.getLat(),
              east: northEast.getLng(),
            });
          }}
          onSelect={selectFromMap}
        />
      </div>

      <DiscoverSearchPanel
        ref={top}
        device={device}
        filters={filters}
        resultCount={filtered.length}
        onFiltersChange={changeFilters}
        onFilterOpen={() => setIsFilterOpen(true)}
      />

      <button type="button" className="r-discover__guide-button" onClick={() => setIsMarkerGuideOpen(true)}>
        <Icon name="pin" />
        마커 안내
      </button>

      <div className="r-discover__float" inert={sheet !== "peek"}>
        {fallbackView ? (
          <div className="r-card r-discover__float-card">{fallbackView}</div>
        ) : isFirstLoad ? (
          <Skeleton shape="card" label="주변 맛집을 불러오고 있어요." className="r-discover-float-skeleton" />
        ) : (
          <PlaceCarousel places={carousel} ctx={ctx} focusedId={focusedId} onFocus={setFocusedId} />
        )}
      </div>

      <DiscoverSheet
        state={sheet}
        onStateChange={setSheet}
        heights={heights}
        title={isFirstLoad ? "주변 맛객 기록" : `이 지역 맛객 기록 ${rows.length}곳`}
        sort={sort}
        canSortByDistance={!!device}
        onSortChange={setSort}
      >
        {fallbackView ?? (
          <DiscoverSheetList places={rows} recentSubscribed={recentSubscribed} nearby={nearby} ctx={ctx} />
        )}
      </DiscoverSheet>

      {isMarkerGuideOpen && <MarkerGuideSheet onClose={() => setIsMarkerGuideOpen(false)} />}

      {isFilterOpen && (
        <FilterSheet
          initial={filters}
          categories={categories}
          tags={tags}
          hasPosition={!!device}
          countMatches={countMatches}
          onApply={(next) => {
            changeFilters(next);
            setIsFilterOpen(false);
          }}
          onClose={() => setIsFilterOpen(false)}
        />
      )}
    </main>
  );
}
