import { useRef, useState, type PointerEvent } from "react";
import type { Place } from "../models/place";
import { go } from "../app/navigation";
import { Avatar, FoodPhoto, TasterMapMarker } from "../components/BrandAssets";
import { FeedTabs } from "../components/AppChrome";
import MapCanvas from "../components/MapCanvas";
import Icon from "../components/Icon";
import { Rating } from "../components/PlaceTile";
import Sheet from "../components/Sheet";
import { categoryMarkerHtml, type CategoryMarkerKind } from "../components/mapMarkerArt";

type Props = {
  places: Place[];
  privatePlaces: Place[];
  subscriptions: string[];
  liked: string[];
  recommendedTasterIds: string[];
  query: string;
  onQuery: (value: string) => void;
  loading: boolean;
  error: string;
};
type VisibleBounds = { south: number; west: number; north: number; east: number };

export default function MapScreen({
  places,
  privatePlaces,
  subscriptions,
  liked,
  recommendedTasterIds,
  query,
  onQuery,
  loading,
  error,
}: Props) {
  // 상세 화면을 다녀와도 지도에서 고른 분류를 유지합니다.
  const feedTabs = ["전체", "구독", "내 맛집", "맛객 추천", "광고 맛집"];
  const [feed, setFeed] = useState(() => {
    const saved = sessionStorage.getItem("matdagong.map.feed");
    return saved && feedTabs.includes(saved) ? saved : "전체";
  });
  function changeFeed(next: string) {
    if (!feedTabs.includes(next)) return;
    sessionStorage.setItem("matdagong.map.feed", next);
    setFeed(next);
  }
  const [listOpen, setListOpen] = useState(false);
  const [bounds, setBounds] = useState<VisibleBounds | null>(null);
  const [devicePosition, setDevicePosition] = useState<{ latitude: number; longitude: number } | null>(null);
  const [markerGuideOpen, setMarkerGuideOpen] = useState(false);
  const dragStart = useRef<number | null>(null);
  const startPanelDrag = (event: PointerEvent<HTMLElement>) => {
    dragStart.current = event.clientY;
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const finishPanelDrag = (event: PointerEvent<HTMLElement>) => {
    if (dragStart.current === null) return;
    const delta = event.clientY - dragStart.current;
    if (Math.abs(delta) > 35) setListOpen(delta < 0);
    dragStart.current = null;
  };
  // 공개 목록과 내 비공개 기록을 같은 장소 ID로 합쳐, 전체 탭에서도 내 기록을 표시합니다.
  const placesById = new Map<string, Place>();
  [...places, ...privatePlaces].forEach((place) => {
    const existing = placesById.get(place.id);
    if (!existing) {
      placesById.set(place.id, place);
      return;
    }
    const authors = new Map(existing.tasters.map((taster) => [taster.tasterId, taster]));
    place.tasters.forEach((taster) => authors.set(taster.tasterId, taster));
    placesById.set(place.id, {
      ...existing,
      ...place,
      recordCount: Math.max(existing.recordCount, place.recordCount),
      visitConditions: [...new Set([...(existing.visitConditions ?? []), ...(place.visitConditions ?? [])])],
      tasters: [...authors.values()],
    });
  });
  const mapPlaces = [...placesById.values()].map((place) => {
    const isSample = /^p-\d+$/.test(place.id);
    const movedSample = isSample && devicePosition;
    return {
      ...place,
      // 장소 서비스의 개발용 샘플 장소(p-001 등)는 서로의 간격을 유지한 채 현재 위치 주변으로 옮겨 보여줍니다.
      // 기준점(37.5642, 126.9254)은 샘플 장소가 모여 있는 연남동 부근으로, 지도 기본 중심과 같습니다.
      latitude: movedSample ? devicePosition.latitude + (place.latitude - 37.5642) : place.latitude,
      longitude: movedSample ? devicePosition.longitude + (place.longitude - 126.9254) : place.longitude,
    };
  });
  const isSubscribedPlace = (place: Place) =>
    place.tasters.some((taster) => subscriptions.includes(taster.tasterId));
  const subscribedPlaces = mapPlaces.filter((place) => !place.advertisement && isSubscribedPlace(place));
  const ownPlaces = mapPlaces.filter((place) =>
    liked.includes(place.id) || place.tasters.some((taster) => taster.tasterId === "me"),
  );
  // '맛객 추천'은 내 기록이나 이미 구독한 기록을 제외한 공개 맛객 기록을 모읍니다.
  // 취향이 맞는 맛객은 같은 탭 안에서 별도 마커로 표시합니다.
  const recommendedPlaces = mapPlaces.filter(
    (place) => !place.advertisement
      && !isSubscribedPlace(place)
      && !liked.includes(place.id)
      && place.tasters.some((taster) => taster.tasterId !== "me"),
  );
  const selectedPlaces = feed === "구독"
    ? subscribedPlaces
    : feed === "내 맛집"
      ? ownPlaces
      : feed === "맛객 추천"
        ? recommendedPlaces
        : feed === "광고 맛집"
          ? mapPlaces.filter((place) => place.advertisement)
          : mapPlaces;
  const visible = selectedPlaces.filter((place) => !bounds || (
    place.latitude >= bounds.south && place.latitude <= bounds.north
      && place.longitude >= bounds.west && place.longitude <= bounds.east
  ));
  return (
    <main className={`map-screen ${listOpen ? "is-list-open" : ""}`}>
      <div className="map-toolbar">
          <label className="search-input">
          <Icon name="search" />
          <input
            aria-label="맛집 이름 검색"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="맛집 이름 검색"
          />
          {query && (
            <button aria-label="검색어 삭제" onClick={() => onQuery("")}>
              <Icon name="close" />
            </button>
          )}
        </label>
      </div>
      <FeedTabs value={feed} onChange={changeFeed} tabs={feedTabs} />
      <p className={`map-feed-hint ${feed === "맛객 추천" ? "is-visible" : ""}`} aria-hidden={feed !== "맛객 추천"}>
        {feed === "맛객 추천" ? "반짝이 핀은 내 취향과 잘 맞는 맛객의 기록이에요." : "지도에서 장소별 맛객 기록을 살펴보세요."}
      </p>
      <div className="map-surface">
        <MapCanvas
          places={visible}
          subscriptions={subscriptions}
          liked={liked}
          recommendedTasterIds={recommendedTasterIds}
          onPositionChange={setDevicePosition}
          onBoundsChange={(nextBounds) => {
            const southWest = nextBounds.getSouthWest();
            const northEast = nextBounds.getNorthEast();
            setBounds({
              south: southWest.getLat(),
              west: southWest.getLng(),
              north: northEast.getLat(),
              east: northEast.getLng(),
            });
          }}
          onSelect={(place) => go("place", place.id)}
        />
        <button className="map-marker-guide-button" onClick={() => setMarkerGuideOpen(true)}>
          <Icon name="pin" /> 마커 안내
        </button>
        {loading && (
          <span className="map-loading">주변 맛집을 불러오고 있어요…</span>
        )}
      </div>
      <div className={`map-panel-anchor ${listOpen ? "expanded" : ""}`}>
        <button
          className="map-list-button"
          type="button"
          aria-label={listOpen ? "지도 보기" : "목록 보기"}
          onClick={() => setListOpen(!listOpen)}
        >
          <Icon name={listOpen ? "map" : "list"} />
          {listOpen ? "지도 보기" : "목록 보기"}
        </button>
        <section className={`map-bottom-card ${listOpen ? "expanded" : ""}`}>
          <span className="grabber" role="button" tabIndex={0} aria-label={listOpen ? "아래로 끌어 지도 보기" : "위로 끌어 목록 보기"}
            onPointerDown={startPanelDrag}
            onPointerUp={finishPanelDrag}
            onPointerCancel={() => { dragStart.current = null; }}
            onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setListOpen((open) => !open); } }} />
          <div className="map-result-label" onPointerDown={startPanelDrag} onPointerUp={finishPanelDrag}
            onPointerCancel={() => { dragStart.current = null; }}>
            <b>
              현재 화면의 맛집 <em>{visible.length}</em>
            </b>
            {!listOpen && <span>지도를 움직이면 목록도 바뀌어요</span>}
          </div>
        {error ? (
          <p className="map-list-message">{error}</p>
        ) : visible.length ? (
          (listOpen ? visible : visible.slice(0, 1)).map((place) => (
            <button
              className="map-place-row"
              key={place.id}
              onClick={() => go("place", place.id)}
            >
              {(() => {
                const recordPhoto = place.tasters.find((taster) => taster.tasterId === "me" && taster.photos?.length)?.photos?.[0]
                  ?? place.tasters.find((taster) => taster.photos?.length)?.photos?.[0];
                return recordPhoto
                  ? <img className="food-photo map-place-photo" src={recordPhoto} alt={`${place.name} 사진`} loading="lazy" decoding="async" />
                  : <FoodPhoto place={place} />;
              })()}
              <span className="map-place-copy">
                <h2>{place.name}</h2>
                <span className="map-place-meta">
                  {place.category && <small className="map-place-category">{place.category.split(">").pop()?.trim()}</small>}
                  <small><Icon name="pin" />{place.address}</small>
                </span>
                {(() => {
                  // 시안처럼 추천한 맛객 얼굴과 이름을 한 줄로 보여 줍니다.
                  const recommenders = place.tasters.filter((taster, index, list) =>
                    list.findIndex((other) => other.tasterId === taster.tasterId) === index);
                  if (!recommenders.length) return <span className="map-place-recommenders"><Rating count={place.recordCount} /></span>;
                  const others = recommenders.length - 1;
                  return (
                    <span className="map-place-recommenders">
                      <span className="map-place-recommender-avatars" aria-hidden="true">
                        {recommenders.slice(0, 3).map((taster) => (
                          <Avatar key={taster.tasterId} src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
                        ))}
                      </span>
                      <small><b>{recommenders[0].tasterName}</b>{others > 0 ? ` 외 ${others}명이 추천` : " 추천"}</small>
                    </span>
                  );
                })()}
                <span className="small-tags" aria-label="맛객 기록 요약">
                  {(() => {
                    const summaryTags = [...new Set(place.tasters.flatMap((taster) => [
                      ...(taster.tags ?? []),
                      ...(taster.menus ?? []).map((menu) => typeof menu === "string" ? menu : menu.name),
                    ]).map((tag) => tag.trim()).filter(Boolean))];
                    const visibleTags = summaryTags.slice(0, 2);
                    return <>{visibleTags.map((tag) => <i key={tag}>#{tag}</i>)}{summaryTags.length > 2 && <i>+{summaryTags.length - 2}</i>}{summaryTags.length === 0 && <i>맛객 기록 {place.recordCount}건</i>}</>;
                  })()}
                </span>
              </span>
              <Icon name="chevron" />
            </button>
          ))
        ) : (
          <p className="map-list-message">{feed === "광고 맛집" ? "현재 소개 중인 광고 맛집이 없어요." : feed === "내 맛집" ? "내 맛집이 아직 없어요. 하트로 저장하거나 직접 등록해 보세요." : "현재 지도 영역에 이 탭의 맛집이 아직 없어요."}</p>
          )}
        </section>
      </div>
      {markerGuideOpen && <Sheet title="지도 마커 안내" onClose={() => setMarkerGuideOpen(false)} className="marker-guide-sheet">
        <p className="marker-guide-intro">핀 색과 표식으로 기록 종류를 구분하고, 프로필 사진을 등록한 맛객은 마커에 사진이 표시돼요.</p>
        <div className="marker-guide-list">
          {[
            ["photo", "프로필 사진", "프로필 사진을 등록하면 맛객 마커에 사진이 표시돼요."],
            ["subscribed", "구독 중인 맛객", "하트 표식으로 구독 관계를 표시해요. 사진이 없으면 캐릭터가 보여요."],
            ["own", "내가 등록한 맛집", "내 캐릭터나 프로필 사진으로 표시해요."],
            ["liked", "내 맛집", "하트로 저장해 둔 맛집이에요. 직접 등록한 맛집은 별도 표식으로 구분해요."],
            ["matched", "취향이 맞는 맛객", "초록색 핀과 반짝이로 취향 일치를 표시해요."],
            ["other", "구독하지 않은 맛객", "부드러운 주황 핀으로 구독하지 않은 맛객을 구분해요."],
            ["ad", "광고 맛집", "광고로 소개하는 장소예요."],
          ].map(([kind, title, description]) => <div className="marker-guide-row" key={kind}>
            <span className={`marker-guide-art marker-guide-art--${kind}`}>
              {kind === "subscribed" || kind === "photo" || kind === "other" || kind === "matched" || kind === "own"
                ? <TasterMapMarker
                    kind={kind === "photo" ? "other" : kind as "subscribed" | "other" | "matched" | "own"}
                    src={kind === "photo" ? "/assets/taster-profile-sample.png" : undefined}
                    name={kind === "photo" ? "맛객 프로필 사진 예시" : "맛다공 캐릭터"}
                  />
                : <span className={`map-category-marker map-category-marker--${kind}`} aria-hidden="true" dangerouslySetInnerHTML={{ __html: categoryMarkerHtml(kind as CategoryMarkerKind) }} />}
            </span>
            <span><b>{title}</b><small>{description}</small></span>
          </div>)}
        </div>
      </Sheet>}
    </main>
  );
}
