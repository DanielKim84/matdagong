import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon, { type IconName } from "../../components/Icon";
import MapCanvas from "../../components/MapCanvas";
import RecordMenuButton from "../../components/RecordMenuButton";
import { EmptyState } from "../../components/ui";
import type { FitRequest, MapMe } from "../../models/map";
import type { Place } from "../../models/place";
import type { Coordinates } from "../../utils/geo";
import { clearMapReturn, prepareMapReturn, readMapReturn } from "../../utils/mapCamera";
import MarkerGuideScreen from "../discover/MarkerGuideScreen";
import { isInBounds, type VisibleBounds } from "../discover/discoverModel";
import { usePlaceContext } from "../discover/usePlaceContext";
import { mapBoundsOf, markerVisibleBounds } from "../discover/mapBounds";
import { openKakaoPlace } from "../place/kakaoPlaceDetail";
import MyMapPlaceList from "./MyMapPlaceList";
import MyPlacesScreen from "./MyPlacesScreen";
import {
  MY_MAP_SCOPES,
  MY_PLACE_CATEGORY_LABELS,
  categoryOf,
  isInScope,
  myMapPlaces,
  type MyMapKind,
  type MyMapScope,
  type MyPlaceCategory,
} from "./myMapModel";

/**
 * 내 지도 탭(#mymap, 보드 06-03): 나와 관련된 맛집만 보는 지도입니다. 내 기록, 다녀온 곳, 가볼 곳을 마커로 나눠 보여 줍니다.
 * 큰 제목과 기록하기 버튼 · 범위 칩 아래 둥근 지도 카드, 그 아래 가볼 곳·가본 곳·공유 중 수(누르면 내 맛집 모음의 그 칩)와
 * "전체 장소 보기 N곳"(장소 검색 화면, 보드 06-04: 내 장소 전부와 카카오맵처럼 지역과 상관없는 가게 검색)이 이어집니다.
 * 마커를 누르면 그 맛집을 지도 바로 아래 한 줄로 보여 주고, 같은 마커를 한 번 더 누르거나 그 줄을 누르면 맛집 상세로 갑니다.
 */
export default function MyMapScreen() {
  const app = useAppData();
  const [mapReturn] = useState(() => readMapReturn("mymap"));
  useEffect(() => clearMapReturn("mymap"), []);
  const [scope, setScope] = useState<MyMapScope>("all");
  const [device, setDevice] = useState<Coordinates | null>(null);
  // 아래 목록은 지금 지도에 보이는 범위의 내 장소입니다.
  const [bounds, setBounds] = useState<VisibleBounds | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(mapReturn?.placeId ?? null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isPlacesOpen, setIsPlacesOpen] = useState(false);
  const mapCard = useRef<HTMLDivElement>(null);
  // 지금 보는 지역에 내 장소가 없을 때 "내 장소 모두 보기"로 지도를 내 장소 전체에 맞춥니다(발견의 검색 맞추기와 같은 방식).
  const [fitMine, setFitMine] = useState<FitRequest | null>(null);

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
  // kinds는 마커 모양(내 기록 얼굴 핀 · 다녀온 곳 체크 · 가볼 곳 하트), categories는 화면에서 부르는 세 갈래입니다.
  const { visiblePlaces, kinds, categories } = useMemo(() => {
    const visible = entries.filter((entry) => isInScope(entry, scope));
    return {
      visiblePlaces: visible.map((entry) => entry.place),
      kinds: new Map<string, MyMapKind>(visible.map((entry) => [entry.place.id, entry.kind])),
      categories: new Map<string, MyPlaceCategory>(visible.map((entry) => [entry.place.id, categoryOf(entry)])),
    };
  }, [entries, scope]);
  const ctx = usePlaceContext(device);
  const focusedPlace = focusedId ? visiblePlaces.find((place) => place.id === focusedId) : undefined;
  const areaCount = bounds ? visiblePlaces.filter((place) => isInBounds(place, bounds)).length : 0;

  const me: MapMe | undefined = app.myProfile
    ? { name: app.myProfile.nickname, variant: app.myProfile.avatarVariant }
    : undefined;
  // 가볼 곳 · 가본 곳 · 공유 중 수(지도 범위와 상관없이 전체). 누르면 내 맛집 모음의 같은 칩(#saved/wish|visited|shared)으로 갑니다.
  const STAT_ICONS: Record<MyPlaceCategory, IconName> = { wish: "heart", visited: "paw", shared: "shared" };
  const stats = (["wish", "visited", "shared"] as const).map((category) => ({
    category,
    label: MY_PLACE_CATEGORY_LABELS[category],
    count: entries.filter((entry) => isInScope(entry, category)).length,
    icon: STAT_ICONS[category],
  }));

  function selectFromMap(place: Place) {
    // 이미 고른 마커를 다시 누르면 상세로, 처음 누르면 목록 맨 위에 표시합니다.
    if (focusedId === place.id) {
      prepareMapReturn("mymap", place.id);
      go("place", place.id);
      return;
    }
    setFocusedId(place.id);
  }
  function openPlace(place: Place) {
    prepareMapReturn("mymap", place.id);
    go("place", place.id);
  }
  function changeBounds(next: MapBounds, isFocusMove: boolean, isUserMove: boolean) {
    // 고른 마커로 지도가 따라간 경우는 선택을 유지합니다. 지도 범위 안 수는 마커가 2/3 이상 보이는 곳만 셉니다.
    const card = mapCard.current;
    const visible = markerVisibleBounds(
      mapBoundsOf(next),
      card ? { width: card.clientWidth, height: card.clientHeight } : null,
    );
    setBounds(visible);
    if (isFocusMove) return;
    if (isUserMove || (focusedPlace && !isInBounds(focusedPlace, visible))) setFocusedId(null);
  }
  function changeScope(next: MyMapScope) {
    setScope(next);
    setFocusedId(null);
  }
  function fitAllMine() {
    setFitMine((current) => ({ places: visiblePlaces, requestId: (current?.requestId ?? 0) + 1 }));
  }

  const isEmpty = !entries.length && !app.isLoading;

  return (
    <main className="r-screen r-discover r-mymap">
      <header className="r-mymap__head">
        <div>
          <h1>내 지도</h1>
          <p>
            내가 가보고 싶은 곳과 다녀온 곳을
            <br />
            지도에서 관리해요.
          </p>
        </div>
        <RecordMenuButton />
      </header>

      <div className="r-chips r-mymap__scopes" role="toolbar" aria-label="내 지도 범위">
        {MY_MAP_SCOPES.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`r-chip ${scope === option.value ? "is-on" : ""}`}
            aria-pressed={scope === option.value}
            onClick={() => changeScope(option.value)}
          >
            {option.value === "wish" && <Icon name="heart" />}
            {option.value === "visited" && <Icon name="paw" />}
            {option.value === "shared" && <Icon name="shared" />}
            {option.label}
          </button>
        ))}
      </div>

      <div className="r-map-card" ref={mapCard}>
        <MapCanvas
          cameraKey="mymap"
          restoreCamera={!!mapReturn}
          places={visiblePlaces}
          subscriptions={[]}
          markerKindOf={(place) => kinds.get(place.id) ?? "liked"}
          focusedPlaceId={focusedId}
          fitRequest={fitMine}
          me={me}
          onPositionChange={setDevice}
          onManualLocate={() => setFocusedId(null)}
          onBoundsChange={changeBounds}
          onSelect={selectFromMap}
        />
      </div>

      {focusedPlace && (
        <section className="r-discover__list" aria-label="지도에서 고른 곳">
          <p className="r-discover__focus-hint">지도에서 고른 곳이에요. 마커나 이 줄을 한 번 더 누르면 상세로 가요.</p>
          <MyMapPlaceList
            places={[focusedPlace]}
            categories={categories}
            ctx={ctx}
            focusedId={focusedId}
            onOpen={openPlace}
          />
        </section>
      )}
      {isEmpty ? (
        <EmptyState
          icon="pin"
          title="아직 내 지도에 표시할 곳이 없어요"
          message="전체 장소 보기에서 가고 싶은 가게를 찾아 하트를 누르면 가볼 곳으로 저장돼요. 다녀온 곳은 기록해 보세요."
        />
      ) : (
        bounds &&
        !areaCount &&
        !focusedPlace && (
          // 지도 아래 수 줄이 밀려나지 않게 큰 빈 화면 대신 한 줄로 알립니다.
          <p className="r-mymap__empty-area">
            이 지역엔 표시할 내 장소가 없어요.
            <button type="button" className="r-text-button" onClick={fitAllMine}>
              내 장소 모두 보기
            </button>
          </p>
        )
      )}

      <ul className="r-mymap__stats">
        {stats.map((stat) => (
          <li key={stat.category}>
            <button type="button" onClick={() => go("saved", stat.category)}>
              <span className={`r-mymap__stat-icon is-${stat.category}`}>
                <Icon name={stat.icon} filled={stat.icon === "heart"} />
              </span>
              <span>
                <b>{stat.label}</b>
                <small>{stat.count}곳</small>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <button type="button" className="r-mymap__all" onClick={() => setIsPlacesOpen(true)}>
        <Icon name="list" />
        <b>전체 장소 보기</b>
        <span>{entries.length}곳</span>
        <Icon name="chevron" />
      </button>

      {isPlacesOpen && (
        <MyPlacesScreen
          myPlaces={entries.map((entry) => entry.place)}
          categories={new Map(entries.map((entry) => [entry.place.id, categoryOf(entry)]))}
          knownPlaces={knownPlaces}
          ctx={ctx}
          device={device}
          onOpenPlace={openPlace}
          onOpenKakao={openKakaoPlace}
          onMarkerGuide={() => setIsGuideOpen(true)}
          onClose={() => setIsPlacesOpen(false)}
        />
      )}
      {isGuideOpen && <MarkerGuideScreen variant="mymap" me={me} onClose={() => setIsGuideOpen(false)} />}
    </main>
  );
}
