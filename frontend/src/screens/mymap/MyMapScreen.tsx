import { useMemo, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import MapCanvas, { type MapMe } from "../../components/MapCanvas";
import RecordMenuButton from "../../components/RecordMenuButton";
import { EmptyState } from "../../components/ui";
import type { Place } from "../../models/place";
import type { Coordinates } from "../../utils/geo";
import DiscoverSheet from "../discover/DiscoverSheet";
import MarkerGuideSheet from "../discover/MarkerGuideSheet";
import PlaceCarousel from "../discover/PlaceCarousel";
import {
  CAROUSEL_LIMIT,
  isInBounds,
  sortPlaces,
  type SheetState,
  type SortOrder,
  type VisibleBounds,
} from "../discover/discoverModel";
import { usePlaceContext } from "../discover/usePlaceContext";
import { useSheetHeights } from "../discover/useSheetHeights";
import { visibleMapArea } from "../discover/visibleMapArea";
import { openKakaoPlace } from "../place/kakaoPlaceDetail";
import MyMapSearch from "./MyMapSearch";
import MyMapSheetList from "./MyMapSheetList";
import {
  MY_MAP_KIND_LABELS,
  MY_MAP_SCOPES,
  isInScope,
  knownPlaceOf,
  myLeadTaster,
  myMapPlaces,
  type MyMapKind,
  type MyMapScope,
} from "./myMapModel";

/**
 * 내 지도 탭(#mymap): 나와 관련된 맛집만 보는 지도입니다. 내 기록, 다녀온 곳, 가볼 곳을 마커로 나눠 보여 주고,
 * 카카오맵처럼 지역과 상관없이 가게를 검색합니다(검색 결과를 누르면 바로 맛집 상세).
 * 발견과 같은 틀입니다: 지도 아래에 지금 보는 지역의 마커를 넘기는 카드, 그 아래 끌어 올리는 목록 시트를 둡니다.
 * 마커를 누르면 그 카드로 넘어가고, 같은 마커를 한 번 더 누르거나 카드·목록을 누르면 맛집 상세로 갑니다.
 * 지도는 내 위치를 가운데로 열고, 카드·목록은 처음부터 그 범위(내 주변) 기준입니다.
 */
export default function MyMapScreen() {
  const app = useAppData();
  const [scope, setScope] = useState<MyMapScope>("all");
  const [sheet, setSheet] = useState<SheetState>("peek");
  const [sort, setSort] = useState<SortOrder>("priority");
  const [device, setDevice] = useState<Coordinates | null>(null);
  // 목록 시트는 지금 지도에 보이는 범위, 카드는 사용자가 지도를 직접 옮겼을 때만 바뀌는 범위를 씁니다
  // (카드를 넘겨 지도가 따라갈 때 카드가 뒤섞이지 않게). 둘 다 지도가 범위를 알려 주기 전에는 비워 둡니다.
  const [bounds, setBounds] = useState<VisibleBounds | null>(null);
  const [regionBounds, setRegionBounds] = useState<VisibleBounds | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const root = useRef<HTMLElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const float = useRef<HTMLDivElement>(null);
  const { heights, style } = useSheetHeights(root, top, float);

  const knownPlaces = useMemo(
    () => [...app.places, ...app.recentPlaces, ...app.myRecords],
    [app.places, app.recentPlaces, app.myRecords],
  );
  const entries = useMemo(
    () =>
      myMapPlaces({
        myRecords: app.myRecords,
        knownPlaces,
        likedPlaceIds: app.likedPlaceIds,
        // 빠른 저장으로 다녀온 곳이 된 뒤 별로였어요를 고른 곳은 지도 마커에서만 뺍니다(내 맛집 모음에는 남음).
        visitedPlaceIds: app.visitedPlaceIds.filter((id) => !app.dislikedPlaceIds.includes(id)),
      }),
    [app.myRecords, knownPlaces, app.likedPlaceIds, app.visitedPlaceIds, app.dislikedPlaceIds],
  );
  // 지도 마커는 장소 배열이 바뀔 때마다 다시 그려지므로, 칩이 바뀔 때만 새 배열을 만듭니다.
  const { visiblePlaces, kinds } = useMemo(() => {
    const visible = entries.filter((entry) => isInScope(entry, scope));
    return {
      visiblePlaces: visible.map((entry) => entry.place),
      kinds: new Map<string, MyMapKind>(visible.map((entry) => [entry.place.id, entry.kind])),
    };
  }, [entries, scope]);
  const ctx = usePlaceContext(device);
  const inArea = (area: VisibleBounds | null) => (area ? visiblePlaces.filter((place) => isInBounds(place, area)) : []);
  // 카드·목록의 기본 순서는 내 기록 → 다녀온 곳 → 가볼 곳(entries 순서)이고, 가까운 순을 고르면 거리순입니다.
  const carousel = inArea(regionBounds).slice(0, CAROUSEL_LIMIT);
  const focusedPlace = focusedId ? visiblePlaces.find((place) => place.id === focusedId) : undefined;
  if (focusedPlace && !carousel.includes(focusedPlace)) carousel.push(focusedPlace);
  const rows = sort === "distance" ? sortPlaces(inArea(bounds), "distance", ctx) : inArea(bounds);

  const me: MapMe | undefined = app.myProfile
    ? { name: app.myProfile.nickname, variant: app.myProfile.avatarVariant }
    : undefined;
  const counts = {
    all: entries.length,
    wish: entries.filter((entry) => isInScope(entry, "wish")).length,
    visited: entries.filter((entry) => isInScope(entry, "visited")).length,
  };

  function selectFromMap(place: Place) {
    // 이미 고른 마커를 다시 누르면 상세로, 처음 누르면 그 카드로 넘깁니다.
    if (focusedId === place.id) {
      go("place", place.id);
      return;
    }
    setFocusedId(place.id);
    setSheet("peek");
  }
  function changeBounds(next: MapBounds, isFocusMove: boolean) {
    // 검색창·카드·시트에 가려진 곳은 빼고, 눈에 보이는 지도 범위의 맛집만 카드·목록에 둡니다.
    const visible = visibleMapArea(next, root.current, top.current);
    setBounds(visible);
    if (isFocusMove) return;
    setRegionBounds(visible);
    if (focusedPlace && !isInBounds(focusedPlace, visible)) setFocusedId(null);
  }
  function changeScope(next: MyMapScope) {
    setScope(next);
    setFocusedId(null);
  }
  /** 맛다공에 있는 가게(맛객 기록이 있거나 내가 저장한 곳)는 그 상세로, 아직 없는 가게는 카카오 가게 정보로 상세를 엽니다. */
  function selectSearched(result: KakaoPlaceResult) {
    const known = knownPlaceOf(result, knownPlaces);
    if (known) go("place", known.id);
    else openKakaoPlace(result);
  }

  const isEmpty = !entries.length && !app.isLoading;

  return (
    <main ref={root} className="r-screen r-discover r-mymap" data-sheet={sheet} style={style}>
      <div className="r-discover__map">
        <MapCanvas
          places={visiblePlaces}
          subscriptions={[]}
          markerKindOf={(place) => kinds.get(place.id) ?? "liked"}
          focusedPlaceId={focusedId}
          me={me}
          onPositionChange={setDevice}
          onBoundsChange={changeBounds}
          onSelect={selectFromMap}
        />
      </div>

      <div ref={top} className="r-discover__top">
        <MyMapSearch onSelect={selectSearched} />
        <div className="r-chips r-discover-chips" role="toolbar" aria-label="내 지도 범위">
          {MY_MAP_SCOPES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`r-chip ${scope === option.value ? "is-on" : ""}`}
              aria-pressed={scope === option.value}
              onClick={() => changeScope(option.value)}
            >
              {option.label} {counts[option.value]}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="r-discover__guide-button" onClick={() => setIsGuideOpen(true)}>
        <Icon name="pin" />
        마커 안내
      </button>

      {/* 기록하기 버튼과 카드(또는 빈 지도 안내)를 한 덩어리로 띄웁니다. 높이를 재서 지도 버튼을 그 위에 둡니다. */}
      <div ref={float} className="r-discover__float" inert={sheet !== "peek"}>
        <div className="r-mymap__record">
          <RecordMenuButton />
        </div>
        {isEmpty ? (
          <div className="r-card r-discover__float-card">
            <EmptyState
              icon="pin"
              title="아직 내 지도에 표시할 곳이 없어요"
              message="위에서 가고 싶은 가게를 찾아 하트를 누르면 가볼 곳으로 저장돼요. 다녀온 곳은 기록해 보세요."
              className="r-discover-empty"
            />
          </div>
        ) : carousel.length > 0 ? (
          // 지역이나 칩이 바뀌면 처음 카드부터 다시 보여 줍니다.
          <PlaceCarousel
            key={`${scope}:${JSON.stringify(regionBounds)}`}
            places={carousel}
            ctx={ctx}
            focusedId={focusedId}
            onFocus={setFocusedId}
            leadOf={myLeadTaster}
            badgeOf={(place) => {
              const kind = kinds.get(place.id);
              return kind && MY_MAP_KIND_LABELS[kind];
            }}
          />
        ) : (
          // 발견과 같이 이 지역에 카드가 없어도 안내 카드를 둡니다. 카드 자리가 비어 있으면 visibleMapArea가 곧 생길 카드 높이만큼
          // 계속 가린 것으로 봐서, 지도 아래쪽 띠에 있는 내 장소가 카드·목록에 끝내 들어오지 못합니다.
          <div className="r-card r-discover__float-card">
            <EmptyState
              icon="pin"
              title="이 지역엔 표시할 내 장소가 없어요"
              message="지도를 옮기거나 축소해서 주변을 둘러보세요."
              className="r-discover-empty"
            />
          </div>
        )}
      </div>

      <DiscoverSheet
        state={sheet}
        onStateChange={setSheet}
        heights={heights}
        title={`이 지역 ${rows.length}곳`}
        sort={sort}
        canSortByDistance={!!device}
        onSortChange={setSort}
        label="내 맛집 목록"
        priorityLabel="내 기록 먼저"
      >
        <MyMapSheetList places={rows} kinds={kinds} ctx={ctx} />
      </DiscoverSheet>

      {isGuideOpen && <MarkerGuideSheet variant="mymap" me={me} onClose={() => setIsGuideOpen(false)} />}
    </main>
  );
}
