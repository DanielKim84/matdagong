import { useEffect, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import MapCanvas from "../../components/MapCanvas";
import { EmptyState, TopBar, type EmptyStateProps } from "../../components/ui";
import type { CenterRequest, FitRequest, MapMe, RadiusView } from "../../models/map";
import type { Place } from "../../models/place";
import { findRegionCenter } from "../../services/kakao";
import type { Coordinates } from "../../utils/geo";
import { useLocationPermission } from "../../hooks/useLocationPermission";
import { clearMapReturn, hasSavedMapCamera, prepareMapReturn, readMapReturn } from "../../utils/mapCamera";
import DiscoverSearchPanel from "./DiscoverSearchPanel";
import DiscoverPlaceList from "./DiscoverPlaceList";
import FilterScreen from "./FilterScreen";
import LocationDeniedCard from "./LocationDeniedCard";
import MapListScreen from "./MapListScreen";
import MarkerGuideScreen from "./MarkerGuideScreen";
import RegionScreen, { type RegionPick } from "./RegionScreen";
import {
  DEFAULT_FILTERS,
  detailFilterCount,
  isInBounds,
  normalizeDiscoverFilters,
  type DiscoverFilters,
  type SortOrder,
  type VisibleBounds,
} from "./discoverModel";
import { loadStoredState, saveStoredState } from "./discoverStorage";
import { useDiscoverPlaces } from "./useDiscoverPlaces";
import { useRegionName } from "../../hooks/useRegionName";
import { mapBoundsOf, markerVisibleBounds } from "./mapBounds";

/** 지도 바로 아래에 보여 줄 맛집 수입니다. 나머지는 "모두 보기"로 여는 지도 목록(보드 06-02)에서 봅니다. */
const MAP_PREVIEW_COUNT = 5;

/**
 * 발견 탭(보드 06-01 지도 카드형): 로고·지역 · 검색창 · 큰 제목 · 맛객 관계 칩 아래에 둥근 지도 카드를 두고,
 * 그 아래로 지금 지도에 보이는 맛집 몇 곳과 "지도에 보이는 곳 N곳 모두 보기"(지도 목록 06-02)가 이어지는 한 장의 스크롤 화면입니다.
 * 검색 중이면 지도 없이 검색 결과 목록(보드 05-01)을 보여 주고, "지도 보기"를 누르면 결과를 지도로 봅니다.
 * 마커를 누르면 그 맛집을 지도 바로 아래에 보여 주고, 같은 마커를 한 번 더 누르거나 목록을 누르면 맛집 상세로 갑니다.
 * 새 맛집을 찾는 곳이라 다른 맛객(구독·구독 안 한)의 기록만 보여 주고, 내 기록·하트한 곳은 내 지도 탭에서 봅니다.
 */
export default function DiscoverScreen() {
  const app = useAppData();
  const [mapReturn] = useState(() => readMapReturn("discover"));
  useEffect(() => clearMapReturn("discover"), []);
  const skipInitialSearchFit = useRef(!!app.query.trim() && !!mapReturn && hasSavedMapCamera("discover"));
  const [stored] = useState(loadStoredState);
  const [filters, setFilters] = useState<DiscoverFilters>(stored.filters);
  const [sort, setSort] = useState<SortOrder>(stored.sort);
  const [device, setDevice] = useState<Coordinates | null>(null);
  const [bounds, setBounds] = useState<VisibleBounds | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(mapReturn?.placeId ?? null);
  // 내 위치를 가운데 두고 걸어서 갈 만한 반경(500m)으로 지도를 맞추는 요청입니다. "내 위치로 보기"마다 번호를 바꿉니다.
  const [radiusView, setRadiusView] = useState<RadiusView | null>({ meters: 500, requestId: 1 });
  const nextRadiusRequestId = useRef(1);
  // 검색 결과가 모두 보이게 지도를 맞추는 요청입니다. 검색 결과가 지금 보는 지역 밖에 있어도 바로 찾을 수 있게 합니다.
  const [searchFit, setSearchFit] = useState<FitRequest | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isMarkerGuideOpen, setIsMarkerGuideOpen] = useState(false);
  const [isMapListOpen, setIsMapListOpen] = useState(false);
  // 검색 결과를 지도로 보는 중인지(보드 05-01 "지도 보기"). 상세에서 지도로 돌아오면 지도로 다시 엽니다.
  const [isSearchMapView, setIsSearchMapView] = useState(!!mapReturn);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  // 지역 선택(보드 05-02)으로 고른 지역 가운데로 지도를 옮기는 요청입니다.
  const [centerRequest, setCenterRequest] = useState<CenterRequest | null>(null);
  // 위치 권한이 꺼져 있으면 위쪽에 안내(보드 18-01)를 둡니다. 직접 지역을 골랐거나 상세에서 돌아온 지도에는 다시 띄우지 않습니다.
  const locationPermission = useLocationPermission();
  const isLocationDenied = locationPermission === "denied" && !device && !centerRequest && !mapReturn;
  const mapCard = useRef<HTMLDivElement>(null);
  const { ctx, filtered, rows, allRows, cuisineOptions, tagSections } = useDiscoverPlaces({
    filters,
    sort,
    device,
    bounds,
  });
  // 제목·지역 버튼의 동네는 지금 지도 가운데 기준입니다(지도를 옮기면 따라 바뀜). 지도가 아직 없으면 내 위치로 찾습니다.
  const mapCenter = bounds
    ? { latitude: (bounds.south + bounds.north) / 2, longitude: (bounds.west + bounds.east) / 2 }
    : device;
  const region = useRegionName(mapCenter);
  const focusedPlace = focusedId ? filtered.find((place) => place.id === focusedId) : undefined;

  useEffect(() => saveStoredState({ filters, sort }), [filters, sort]);

  // 탭 저장소에 태그 사전이 바뀌기 전 이름이 남아 있으면, 사전을 받은 뒤 필터 묶음에 지금 있는 이름만 남깁니다.
  useEffect(() => {
    if (!app.tasteTags.length) return;
    setFilters((current) => normalizeDiscoverFilters(current, app.tasteTags));
  }, [app.tasteTags]);

  // 검색 응답이 도착해 결과가 바뀔 때마다 한 번 맞춥니다. 응답을 기다리는 동안의 이전 목록으로는 옮기지 않습니다.
  const searchResultKey = app.query.trim() && !app.isLoading ? filtered.map((place) => place.id).join(",") : "";
  useEffect(() => {
    if (!searchResultKey) return;
    if (skipInitialSearchFit.current) {
      skipInitialSearchFit.current = false;
      return;
    }
    setFocusedId(null);
    setSearchFit((current) => ({ places: filtered, requestId: (current?.requestId ?? 0) + 1 }));
  }, [searchResultKey]);

  // 지도 위 내 위치는 내 기본 캐릭터(프로필의 캐릭터 번호)로 보여 줍니다.
  const me: MapMe | undefined = app.myProfile
    ? { name: app.myProfile.nickname, variant: app.myProfile.avatarVariant }
    : undefined;

  const hasFilterChanges = filters.scope !== "all" || detailFilterCount(filters) > 0;
  const isFirstLoad = app.isLoading && !app.places.length;
  const isSearching = !!app.query.trim();
  const showsMap = !isSearching || isSearchMapView;

  function selectFromMap(place: Place) {
    // 이미 고른 핀을 다시 누르면 상세로, 처음 누르면 카드로 보여 줍니다.
    if (focusedId === place.id) {
      prepareMapReturn("discover", place.id);
      go("place", place.id);
      return;
    }
    setFocusedId(place.id);
  }
  function openPlace(place: Place) {
    prepareMapReturn("discover", place.id);
    go("place", place.id);
  }
  /** 목록 줄: 처음 누르면 지도를 그 가게로 옮겨 보여 주고(지도 카드까지 올림), 한 번 더 누르면 상세로 갑니다(마커와 같은 규칙). */
  function selectFromList(place: Place) {
    if (focusedId === place.id) {
      openPlace(place);
      return;
    }
    setFocusedId(place.id);
    mapCard.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function changeBounds(next: MapBounds, isFocusMove: boolean, isUserMove: boolean) {
    // 지도 마커와 아래 목록은 같은 지도 경계를 씁니다.
    // 목록·수는 마커가 2/3 이상 보이는 곳만 셉니다(가장자리에 꼭지만 걸친 마커는 빼기).
    const card = mapCard.current;
    const visible = markerVisibleBounds(
      mapBoundsOf(next),
      card ? { width: card.clientWidth, height: card.clientHeight } : null,
    );
    setBounds(visible);
    // 고른 마커로 지도가 따라간 경우는 선택을 유지하고, 사용자가 지도를 직접 움직이면 낡은 선택을 풉니다.
    if (isFocusMove) return;
    if (isUserMove || (focusedPlace && !isInBounds(focusedPlace, visible))) setFocusedId(null);
  }
  /** 내 위치로 보기: 내 위치를 가운데 두고 걸어서 갈 만한 반경으로 지도를 다시 맞춥니다(지역 선택 화면의 첫 줄). */
  function showMyArea() {
    setIsRegionOpen(false);
    setFocusedId(null);
    setRadiusView((current) => ({ meters: current?.meters ?? 500, requestId: ++nextRadiusRequestId.current }));
  }
  /** 지역 선택: 고른 시/도·구/군의 가운데를 카카오 주소 검색으로 찾아 그 배율로 지도를 옮깁니다. 못 찾으면 알리고 화면을 그대로 둡니다. */
  async function showRegion(pick: RegionPick) {
    const center = await findRegionCenter(pick.query);
    if (!center) {
      app.actions.notify({
        kind: "error",
        title: "지역을 찾지 못했어요",
        message: `‘${pick.label}’ 위치를 찾지 못했어요. 다른 지역을 골라 주세요.`,
      });
      return;
    }
    setIsRegionOpen(false);
    setFocusedId(null);
    setCenterRequest((current) => ({ center, level: pick.level, requestId: (current?.requestId ?? 0) + 1 }));
  }
  /** 위치 켜기: 한 번 거부한 권한은 브라우저가 다시 묻지 않으므로 설정에서 켜는 곳을 알려 줍니다. 켜면 지도가 바로 내 위치를 잡습니다. */
  function explainLocationSetting() {
    app.actions.notify({
      kind: "info",
      title: "위치 권한을 켜 주세요",
      message:
        "브라우저 주소창 왼쪽의 자물쇠(휴대폰은 설정 › 앱 › 위치)에서 위치를 허용해 주세요. 허용하면 바로 내 위치로 옮겨요.",
    });
  }
  /** 검색 결과 목록 ↔ 지도. 목록으로 볼 때 숨겨 둔 지도는 결과 범위를 맞추지 못하므로, 지도로 바꿀 때 결과가 모두 보이게 다시 맞춥니다. */
  function changeSearchMapView(next: boolean) {
    setIsSearchMapView(next);
    if (next) setSearchFit((current) => ({ places: filtered, requestId: (current?.requestId ?? 0) + 1 }));
  }
  function changeFilters(next: DiscoverFilters) {
    setFilters(next);
    setFocusedId(null);
  }

  // 목록 대신 보여 줄 오류·빈 화면입니다.
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
            title: "조건에 맞는 맛집이 없어요",
            message: "필터를 줄이면 더 많은 곳을 볼 수 있어요.",
            action: { label: "조건 초기화", onClick: () => changeFilters(DEFAULT_FILTERS) },
          }
        : {
            title: "아직 맛집 기록이 없어요",
            message: "다녀온 맛집을 기록하면 지도에 바로 나타나요.",
            action: { label: "첫 기록 남기기", onClick: () => go("register") },
          };
  }
  const fallbackView = fallback && <EmptyState {...fallback} className="r-discover-empty" />;

  return (
    <main className="r-screen r-discover">
      <TopBar
        title="맛다공 발견"
        isBrand
        right={
          <button
            type="button"
            className="r-region-button"
            onClick={() => setIsRegionOpen(true)}
            aria-label="지역 선택"
          >
            <Icon name="pin" />
            {region || "내 주변"}
            <Icon name="chevron-down" />
          </button>
        }
      />

      <DiscoverSearchPanel
        region={region}
        filters={filters}
        resultCount={filtered.length}
        sort={sort}
        canSortByDistance={!!device}
        onSortChange={setSort}
        isMapView={isSearchMapView}
        onMapViewChange={changeSearchMapView}
        onFiltersChange={changeFilters}
        onFilterOpen={() => setIsFilterOpen(true)}
        notice={
          isLocationDenied && (
            <LocationDeniedCard onEnable={explainLocationSetting} onPickRegion={() => setIsRegionOpen(true)} />
          )
        }
      />

      {/* 검색 결과 목록으로 볼 때도 지도를 숨기기만 해 지도 위치·내 위치를 그대로 둡니다. */}
      <div className="r-map-card" ref={mapCard} hidden={!showsMap}>
        <MapCanvas
          cameraKey="discover"
          restoreCamera={!!mapReturn}
          places={filtered}
          subscriptions={app.subscriptionIds}
          focusedPlaceId={focusedId}
          radiusView={radiusView}
          fitRequest={searchFit}
          centerRequest={centerRequest}
          me={me}
          onPositionChange={setDevice}
          onManualLocate={() => setFocusedId(null)}
          onBoundsChange={changeBounds}
          onSelect={selectFromMap}
        />
      </div>

      <section className="r-discover__list" aria-label={showsMap ? "지도에 보이는 맛집" : "검색 결과"}>
        {focusedPlace && showsMap && (
          <p className="r-discover__focus-hint">지도에서 고른 곳이에요. 마커나 이 줄을 한 번 더 누르면 상세로 가요.</p>
        )}
        {fallbackView ??
          (showsMap ? (
            <>
              <DiscoverPlaceList
                places={(focusedPlace
                  ? [focusedPlace, ...rows.filter((place) => place.id !== focusedPlace.id)]
                  : rows
                ).slice(0, MAP_PREVIEW_COUNT)}
                ctx={ctx}
                focusedId={focusedId}
                onOpen={selectFromList}
              />
              {rows.length > 0 && (
                <button type="button" className="r-discover__more" onClick={() => setIsMapListOpen(true)}>
                  지도에 보이는 곳 {rows.length}곳 모두 보기
                  <Icon name="chevron" />
                </button>
              )}
            </>
          ) : (
            <DiscoverPlaceList places={allRows} ctx={ctx} onOpen={openPlace} />
          ))}
      </section>

      {isMapListOpen && (
        <MapListScreen
          places={rows}
          ctx={ctx}
          region={region}
          sort={sort}
          canSortByDistance={!!device}
          onSortChange={setSort}
          onOpen={openPlace}
          onMarkerGuide={() => setIsMarkerGuideOpen(true)}
          onClose={() => setIsMapListOpen(false)}
        />
      )}
      {isMarkerGuideOpen && <MarkerGuideScreen me={me} onClose={() => setIsMarkerGuideOpen(false)} />}
      {isRegionOpen && (
        <RegionScreen
          onPick={(pick) => void showRegion(pick)}
          onMyArea={showMyArea}
          onClose={() => setIsRegionOpen(false)}
        />
      )}
      {isFilterOpen && (
        <FilterScreen
          initial={filters}
          cuisineOptions={cuisineOptions}
          tagSections={tagSections}
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
