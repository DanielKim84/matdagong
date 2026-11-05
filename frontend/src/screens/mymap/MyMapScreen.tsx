import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import MapCanvas, { type FitRequest, type MapMe } from "../../components/MapCanvas";
import RecordMenuButton from "../../components/RecordMenuButton";
import { EmptyState } from "../../components/ui";
import type { MapKind, Place } from "../../models/place";
import type { Coordinates } from "../../utils/geo";
import MarkerGuideSheet from "../discover/MarkerGuideSheet";
import { relocateSamples } from "../discover/discoverModel";
import MyMapCard from "./MyMapCard";
import MyMapSearch from "./MyMapSearch";
import { MY_MAP_SCOPES, isInScope, knownPlaceOf, myMapPlaces, placeFromKakao, type MyMapScope } from "./myMapModel";

/**
 * 내 지도 탭(#mymap): 나와 관련된 맛집만 보는 지도입니다. 내 기록, 다녀온 곳, 가볼 곳을 마커로 나눠 보여 주고,
 * 카카오맵처럼 지역과 상관없이 가게를 검색해 가볼 곳으로 저장합니다. 기록하기 버튼도 여기에 둡니다.
 * 지도·검색창·칩은 발견 화면과 같은 모양(r-discover 규칙)을 씁니다.
 */
export default function MyMapScreen() {
  const app = useAppData();
  const [scope, setScope] = useState<MyMapScope>("all");
  const [device, setDevice] = useState<Coordinates | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [searched, setSearched] = useState<KakaoPlaceResult | null>(null);
  const [fitRequest, setFitRequest] = useState<FitRequest | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

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
        visitedLikedPlaceIds: app.visitedLikedPlaceIds,
      }).map((entry) => ({ ...entry, place: relocateSamples([entry.place], device)[0] })),
    [app.myRecords, knownPlaces, app.likedPlaceIds, app.visitedLikedPlaceIds, device],
  );
  const known = searched ? knownPlaceOf(searched, knownPlaces) : undefined;
  // 검색한 가게가 이미 내 지도에 있으면 그 장소를, 아니면 잠깐 올린 검색 마커를 고릅니다.
  const searchedEntry = known ? entries.find((entry) => entry.place.id === known.id) : undefined;
  // 지도 마커는 장소 배열이 바뀔 때마다 다시 그려지므로, 고르기·카드 열기만으로는 새 배열을 만들지 않습니다.
  const { mapPlaces, visiblePlaces, kinds, searchedPlace } = useMemo(() => {
    const visible = entries.filter((entry) => isInScope(entry, scope));
    const searchedPlace = searched ? placeFromKakao(searched) : null;
    const isSearchedOnMap = !!searchedPlace && !entries.some((entry) => entry.place.providerPlaceId === searched?.id);
    return {
      visiblePlaces: visible.map((entry) => entry.place),
      mapPlaces: [...visible.map((entry) => entry.place), ...(isSearchedOnMap && searchedPlace ? [searchedPlace] : [])],
      kinds: new Map<string, MapKind>(visible.map((entry) => [entry.place.id, entry.kind])),
      searchedPlace,
    };
  }, [entries, scope, searched]);
  const focusedEntry = focusedId ? entries.find((entry) => entry.place.id === focusedId) : undefined;

  const me: MapMe | undefined = app.myProfile
    ? { name: app.myProfile.nickname, variant: app.myProfile.avatarVariant }
    : undefined;
  const counts = {
    all: entries.length,
    wish: entries.filter((entry) => entry.kind === "liked").length,
    visited: entries.filter((entry) => entry.kind !== "liked").length,
  };

  function selectFromMap(place: Place) {
    if (place.id === searchedPlace?.id) return;
    // 이미 고른 마커를 다시 누르면 상세로, 처음 누르면 카드로 보여 줍니다.
    if (focusedId === place.id && !searched) {
      go("place", place.id);
      return;
    }
    setSearched(null);
    setFocusedId(place.id);
  }

  function selectSearched(result: KakaoPlaceResult) {
    const place = placeFromKakao(result);
    const existing = knownPlaceOf(result, knownPlaces);
    const mine = existing && entries.find((entry) => entry.place.id === existing.id);
    setSearched(result);
    setFocusedId(mine ? mine.place.id : place.id);
    // 검색한 가게가 지금 범위(칩)에서 빠져 있으면 보이도록 전체로 돌립니다.
    if (mine && !isInScope(mine, scope)) setScope("all");
    setFitRequest((current) => ({ places: [mine?.place ?? place], requestId: (current?.requestId ?? 0) + 1 }));
  }

  function closeCard() {
    setSearched(null);
    setFocusedId(null);
  }

  const hasCard = !!searched || !!focusedEntry;

  return (
    <main className="r-screen r-discover r-mymap" data-card={hasCard ? "open" : "closed"}>
      <div className="r-discover__map">
        <MapCanvas
          places={mapPlaces}
          subscriptions={[]}
          markerKindOf={(place) => kinds.get(place.id) ?? "search"}
          focusedPlaceId={focusedId}
          // 처음 열 때와 칩을 바꿀 때 내 장소가 모두 보이게 맞춥니다. 검색한 가게는 fitRequest로 따로 맞춥니다.
          fitToPlaces
          fitPlaces={visiblePlaces}
          fitRequest={fitRequest}
          me={me}
          onPositionChange={setDevice}
          onSelect={selectFromMap}
        />
      </div>

      <div className="r-discover__top">
        <MyMapSearch onSelect={selectSearched} />
        <div className="r-chips r-discover-chips" role="toolbar" aria-label="내 지도 범위">
          {MY_MAP_SCOPES.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`r-chip ${scope === option.value ? "is-on" : ""}`}
              aria-pressed={scope === option.value}
              onClick={() => {
                setScope(option.value);
                setFocusedId(null);
              }}
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

      <div className="r-mymap__bottom">
        <RecordMenuButton className="r-mymap__record" />
        {hasCard ? (
          <MyMapCard
            key={searched?.id ?? focusedId}
            entry={searchedEntry ?? (searched ? undefined : focusedEntry)}
            searched={searched ?? undefined}
            known={known}
            onSaved={(placeId) => {
              setSearched(null);
              setFocusedId(placeId);
            }}
            onClose={closeCard}
          />
        ) : (
          !entries.length &&
          !app.loading && (
            <div className="r-card r-mymap__empty">
              <EmptyState
                icon="pin"
                title="아직 내 지도에 표시할 곳이 없어요"
                message="위에서 가고 싶은 가게를 찾아 가볼 곳으로 저장하거나, 다녀온 곳을 기록해 보세요."
              />
            </div>
          )
        )}
      </div>

      {isGuideOpen && <MarkerGuideSheet variant="mymap" me={me} onClose={() => setIsGuideOpen(false)} />}
    </main>
  );
}
