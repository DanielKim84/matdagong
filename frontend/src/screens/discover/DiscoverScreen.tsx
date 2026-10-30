import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Place, Taster } from "../../models/place";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import MapCanvas from "../../components/MapCanvas";
import { NotificationButton } from "../../components/ui";
import type { Coordinates } from "../../utils/geo";
import DiscoverSheet from "./DiscoverSheet";
import FilterSheet from "./FilterSheet";
import PlaceCarousel from "./PlaceCarousel";
import { regionNameAt } from "./regionName";
import {
  DEFAULT_FILTERS,
  SCOPE_OPTIONS,
  detailFilterCount,
  distanceTo,
  isMatchedPlace,
  isSubscribedPlace,
  loadStoredState,
  matchesFilters,
  mergePlaces,
  relocateSamples,
  saveStoredState,
  sortPlaces,
  topCategories,
  topTags,
  type DiscoverFilters,
  type PlaceContext,
  type SheetState,
  type SortOrder,
} from "./discoverModel";

type VisibleBounds = { south: number; west: number; north: number; east: number };

// AI 추천은 비용 때문에 기능 플래그로 켤 때만 칩을 보여 줍니다.
const AI_PICK_ENABLED = import.meta.env.VITE_FEATURE_AI_PICK === "true";
// 접힘 시트는 제목 줄(72px)과 떠 있는 하단 탭 자리(탭 82px + 여백 22px)를 더한 높이입니다.
const PEEK_HEIGHT = 176;
const CAROUSEL_LIMIT = 30;
const RECENT_LIMIT = 8;
const NEARBY_LIMIT = 6;
const NEARBY_RADIUS_METERS = 1000;

/** 발견 탭(앱 첫 화면): 화면 가득 지도, 넘기는 장소 카드, 끌어 올리는 목록 시트. */
export default function DiscoverScreen() {
  const app = useAppData();
  const [stored] = useState(loadStoredState);
  const [filters, setFilters] = useState<DiscoverFilters>(stored.filters);
  const [sheet, setSheet] = useState<SheetState>(stored.sheet);
  const [sort, setSort] = useState<SortOrder>(stored.sort);
  const [device, setDevice] = useState<Coordinates | null>(null);
  const [region, setRegion] = useState("");
  const [bounds, setBounds] = useState<VisibleBounds | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [size, setSize] = useState({ height: 0, top: 0 });
  const root = useRef<HTMLElement>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => saveStoredState({ filters, sheet, sort }), [filters, sheet, sort]);

  // 시트 높이를 화면과 상단 검색 영역 크기에 맞춰 계산합니다.
  useLayoutEffect(() => {
    const measure = () => {
      const height = root.current?.clientHeight ?? 0;
      const topBottom = top.current ? top.current.offsetTop + top.current.offsetHeight : 0;
      setSize((current) => current.height === height && current.top === topBottom ? current : { height, top: topBottom });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    if (top.current) observer.observe(top.current);
    return () => observer.disconnect();
  }, []);

  // 내 위치가 잡히면 검색창 앞에 동네 이름을 붙입니다.
  const latitude = device?.latitude, longitude = device?.longitude;
  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;
    let active = true;
    void regionNameAt({ latitude, longitude }).then((name) => { if (active) setRegion(name); });
    return () => { active = false; };
  }, [latitude, longitude]);

  // 지도 마커는 장소 배열이 바뀔 때마다 다시 그려지므로, 카드 선택·지도 이동만으로는 새 배열을 만들지 않습니다.
  const { subscriptionIds, likedPlaceIds, tasterById, places, privatePlaces, recommendedTasters } = app;
  const ctx = useMemo<PlaceContext>(() => ({
    subscriptions: new Set(subscriptionIds),
    liked: new Set(likedPlaceIds),
    device,
    matchOf: (taster: Taster) => taster.matchScore ?? tasterById.get(taster.tasterId)?.matchScore ?? 0,
  }), [subscriptionIds, likedPlaceIds, tasterById, device]);
  const allPlaces = useMemo(() => relocateSamples(mergePlaces(places, privatePlaces), device), [places, privatePlaces, device]);
  const filtered = useMemo(() => allPlaces.filter((place) => matchesFilters(place, filters, ctx)), [allPlaces, filters, ctx]);
  const recommendedTasterIds = useMemo(() => recommendedTasters.map((taster) => taster.tasterId), [recommendedTasters]);
  const countFor = (next: DiscoverFilters) => allPlaces.filter((place) => matchesFilters(place, next, ctx)).length;

  // 카드 순서는 지도 이동과 무관하게 유지해야 넘기는 동안 카드가 뒤섞이지 않습니다.
  const carousel = sortPlaces(filtered, "priority", ctx).slice(0, CAROUSEL_LIMIT);
  const focusedPlace = focusedId ? filtered.find((place) => place.id === focusedId) : undefined;
  if (focusedPlace && !carousel.includes(focusedPlace)) carousel.push(focusedPlace);

  const inView = filtered.filter((place) => !bounds || (
    place.latitude >= bounds.south && place.latitude <= bounds.north
      && place.longitude >= bounds.west && place.longitude <= bounds.east
  ));
  const rows = sortPlaces(inView, sort, ctx);

  const recentSubscribed = filtered
    .flatMap((place) => place.tasters
      .filter((taster) => ctx.subscriptions.has(taster.tasterId))
      .map((taster) => ({ place, taster })))
    .sort((left, right) => (right.taster.recordedAt ?? "").localeCompare(left.taster.recordedAt ?? ""))
    .slice(0, RECENT_LIMIT);
  const bestMatch = (place: Place) => Math.max(0, ...place.tasters.map(ctx.matchOf));
  const nearby = device
    ? filtered
      .filter((place) => !isSubscribedPlace(place, ctx) && isMatchedPlace(place, ctx)
        && (distanceTo(place, ctx) ?? Infinity) <= NEARBY_RADIUS_METERS)
      .sort((left, right) => bestMatch(right) - bestMatch(left)
        || (distanceTo(left, ctx) ?? 0) - (distanceTo(right, ctx) ?? 0))
      .slice(0, NEARBY_LIMIT)
    : [];

  const categories = topCategories(allPlaces);
  const quickCategories = categories.slice(0, 5);
  if (filters.category && !quickCategories.includes(filters.category)) quickCategories.unshift(filters.category);
  const detailCount = detailFilterCount(filters);
  const filtersChanged = filters.scope !== "all" || detailCount > 0;
  const firstLoad = app.loading && !app.places.length;

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
  function openAiPick() {
    app.actions.notify({ kind: "info", title: "AI 추천은 준비 중이에요", message: "맛객 기록을 근거로 골라 주는 추천을 준비하고 있어요." });
  }

  // 목록 대신 보여 줄 오류·빈 화면입니다. 카드 자리와 시트에 같은 내용을 씁니다.
  let fallback: { title: string; message: string; action: string; onAction: () => void } | null = null;
  if (app.error && !app.places.length) {
    fallback = { title: "맛집을 불러오지 못했어요", message: app.error, action: "다시 불러오기", onAction: app.actions.retry };
  } else if (!firstLoad && !filtered.length) {
    fallback = app.query
      ? { title: `‘${app.query}’ 검색 결과가 없어요`, message: "맛집 이름이나 음식 종류, 동네 이름으로 다시 찾아보세요.", action: "검색어 지우기", onAction: () => app.setQuery("") }
      : filtersChanged
        ? { title: "조건에 맞는 맛객 기록이 없어요", message: "필터를 줄이면 더 많은 곳을 볼 수 있어요.", action: "조건 초기화", onAction: () => changeFilters(DEFAULT_FILTERS) }
        : { title: "아직 맛객 기록이 없어요", message: "다녀온 맛집을 기록하면 지도에 바로 나타나요.", action: "첫 기록 남기기", onAction: () => go("register") };
  }
  const fallbackView = fallback && (
    <div className="r-empty r-discover-empty" role={app.error ? "alert" : undefined}>
      <b>{fallback.title}</b>
      <p>{fallback.message}</p>
      <button type="button" className="r-button r-button--secondary r-button--pill" onClick={fallback.onAction}>{fallback.action}</button>
    </div>
  );

  const heights: Record<SheetState, number> = {
    peek: PEEK_HEIGHT,
    half: Math.round(size.height * 0.5),
    full: Math.max(PEEK_HEIGHT, size.height - size.top - 8),
  };
  const style = (size.height ? {
    "--r-discover-half": `${heights.half}px`,
    "--r-discover-full": `${heights.full}px`,
  } : {}) as CSSProperties;

  return (
    <main ref={root} className="r-screen r-discover" data-sheet={sheet} style={style}>
      <div className="r-discover__map">
        <MapCanvas
          places={filtered}
          subscriptions={subscriptionIds}
          liked={likedPlaceIds}
          recommendedTasterIds={recommendedTasterIds}
          focusedPlaceId={focusedId}
          onPositionChange={setDevice}
          onBoundsChange={(next) => {
            const southWest = next.getSouthWest();
            const northEast = next.getNorthEast();
            setBounds({ south: southWest.getLat(), west: southWest.getLng(), north: northEast.getLat(), east: northEast.getLng() });
          }}
          onSelect={selectFromMap}
        />
      </div>

      <div className="r-discover__top" ref={top}>
        <div className="r-discover__search-row">
          <label className="r-discover-search">
            <Icon name="search" />
            <span className="visually-hidden">맛집 검색</span>
            <input
              type="search"
              value={app.query}
              onChange={(event) => app.setQuery(event.target.value)}
              placeholder={`${region ? `${region} · ` : ""}맛집, 음식 종류, 동네`}
              enterKeyHint="search"
            />
            {app.query && (
              <button type="button" className="r-discover-search__clear" aria-label="검색어 지우기" onClick={() => app.setQuery("")}>
                <Icon name="close" />
              </button>
            )}
          </label>
          <NotificationButton floating />
        </div>

        <div className="r-chips r-discover-chips" role="toolbar" aria-label="지도 필터">
          <button
            type="button"
            className={`r-chip r-discover-chips__filter ${detailCount ? "is-on" : ""}`}
            onClick={() => setFilterOpen(true)}
            aria-label={detailCount ? `필터, ${detailCount}개 적용 중` : "필터"}
          >
            <Icon name="filter" />
            필터{detailCount > 0 && <i>{detailCount}</i>}
          </button>
          {SCOPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`r-chip ${filters.scope === option.value ? "is-on" : ""}`}
              aria-pressed={filters.scope === option.value}
              onClick={() => changeFilters({ ...filters, scope: option.value })}
            >
              {option.label}
            </button>
          ))}
          {AI_PICK_ENABLED && (
            <button type="button" className="r-chip r-chip--accent" onClick={openAiPick}>
              <Icon name="sparkle" />AI 추천
            </button>
          )}
          {quickCategories.length > 0 && <span className="r-discover-chips__divider" aria-hidden="true" />}
          {quickCategories.map((category) => (
            <button
              key={category}
              type="button"
              className={`r-chip ${filters.category === category ? "is-on" : ""}`}
              aria-pressed={filters.category === category}
              onClick={() => changeFilters({ ...filters, category: filters.category === category ? "" : category })}
            >
              {category}
            </button>
          ))}
        </div>

        {app.error && app.places.length > 0 ? (
          <p className="r-discover-status" role="alert">
            새 목록을 불러오지 못했어요
            <button type="button" onClick={app.actions.retry}>다시 시도</button>
          </p>
        ) : (app.loading || app.query) && (
          <p className="r-discover-status" role="status">
            {app.loading ? "주변 맛집을 불러오고 있어요…" : `‘${app.query}’ 검색 결과 ${filtered.length}곳`}
          </p>
        )}
      </div>

      <div className="r-discover__float" inert={sheet !== "peek"}>
        {fallbackView ? (
          <div className="r-card r-discover__float-card">{fallbackView}</div>
        ) : firstLoad ? (
          <div className="r-discover-card r-discover-card--skeleton" aria-hidden="true" />
        ) : (
          <PlaceCarousel
            places={carousel}
            ctx={ctx}
            focusedId={focusedId}
            onFocus={setFocusedId}
            photoFor={app.photoFor}
          />
        )}
      </div>

      <DiscoverSheet
        state={sheet}
        onStateChange={setSheet}
        heights={heights}
        title={firstLoad ? "주변 맛객 기록" : `이 지역 맛객 기록 ${rows.length}곳`}
        sort={sort}
        canSortByDistance={!!device}
        onSortChange={setSort}
        places={rows}
        recentSubscribed={recentSubscribed}
        nearby={nearby}
        ctx={ctx}
        likedIds={app.likedPlaceIds}
        onToggleLike={(placeId) => void app.actions.toggleLike(placeId)}
        photoFor={app.photoFor}
        loading={app.loading}
        fallback={fallbackView ?? undefined}
      />

      {filterOpen && (
        <FilterSheet
          initial={filters}
          categories={categories}
          tags={topTags(allPlaces)}
          hasPosition={!!device}
          countFor={countFor}
          onApply={(next) => {
            changeFilters(next);
            setFilterOpen(false);
          }}
          onClose={() => setFilterOpen(false)}
        />
      )}
    </main>
  );
}
