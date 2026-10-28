import { useState } from "react";
import type { Place } from "../models/place";
import { go } from "../app/navigation";
import { FoodPhoto, TasterMapMarker } from "../components/BrandAssets";
import { FeedTabs } from "../components/AppChrome";
import MapCanvas from "../components/MapCanvas";
import Icon from "../components/Icon";
import { Rating } from "../components/PlaceTile";
import Sheet from "../components/Sheet";

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
type CategoryMarkerKind = "liked" | "ad";

function CategoryMarkerArtwork({ kind }: { kind: CategoryMarkerKind }) {
  const glyphs: Record<CategoryMarkerKind, string> = {
    liked: '<svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6Z"/></svg>',
    ad: '<svg viewBox="0 0 24 24"><path d="M3 10h18v10H3zM2 10l2-6h16l2 6M6 4v6m4-6v6m4-6v6m4-6v6M9 14h6v6H9z"/></svg>',
  };
  return <><svg className="map-category-marker-shell" viewBox="0 0 43 53" aria-hidden="true"><path d="M21.5 52S2 32.7 2 19.4a19.5 19.5 0 1 1 39 0C41 32.7 21.5 52 21.5 52Z" /></svg><span className="map-category-marker-glyph" aria-hidden="true" dangerouslySetInnerHTML={{ __html: glyphs[kind] }} /></>;
}

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
  // 전체 보기부터 시작해 현재 지도 영역의 기록을 한눈에 확인하게 합니다.
  const [feed, setFeed] = useState("전체");
  const [listOpen, setListOpen] = useState(false);
  const [bounds, setBounds] = useState<VisibleBounds | null>(null);
  const [markerGuideOpen, setMarkerGuideOpen] = useState(false);
  // 샘플 장소에만 테스트용 핀 유형을 붙여 여러 범례 상태를 한 번에 확인합니다.
  const sampleKinds: Record<string, Place["sampleMarkerKind"]> = {
    "p-001": "subscribedPhoto",
    "p-002": "subscribed",
    "p-003": "matched",
    "p-004": "other",
    "p-005": "liked",
    "p-006": "own",
    "p-009": "matched",
    "p-010": "other",
  };
  const mapPlaces = places.map((place) => ({
    ...place,
    sampleMarkerKind: place.sampleMarkerKind ?? sampleKinds[place.id],
  }));
  const isSampleSubscription = (place: Place) =>
    place.sampleMarkerKind === "subscribed" || place.sampleMarkerKind === "subscribedPhoto";
  const isSubscribedPlace = (place: Place) =>
    place.tasters.some((taster) => subscriptions.includes(taster.tasterId)) || isSampleSubscription(place);
  const subscribedPlaces = mapPlaces.filter((place) => !place.advertisement && isSubscribedPlace(place));
  const likedPlaces = mapPlaces.filter((place) => liked.includes(place.id) || place.sampleMarkerKind === "liked" || place.sampleMarkerKind === "own");
  const ownPlaces = [...new Map([
    ...likedPlaces,
    ...privatePlaces,
    ...mapPlaces.filter((place) => place.tasters.some((taster) => taster.tasterId === "me") || place.sampleMarkerKind === "own"),
  ].map((place) => [place.id, place])).values()];
  // '맛객 추천'은 내 기록이나 이미 구독한 기록을 제외한 공개 맛객 기록을 모읍니다.
  // 취향이 맞는 맛객은 같은 탭 안에서 별도 마커로 표시합니다.
  const recommendedPlaces = mapPlaces.filter(
    (place) => !place.advertisement
      && !isSubscribedPlace(place)
      && !liked.includes(place.id)
      && place.sampleMarkerKind !== "liked"
      && place.sampleMarkerKind !== "own"
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
      <FeedTabs value={feed} onChange={setFeed} tabs={["전체", "구독", "내 맛집", "맛객 추천", "광고 맛집"]} />
      <p className={`map-feed-hint ${feed === "맛객 추천" ? "is-visible" : ""}`} aria-hidden={feed !== "맛객 추천"}>
        {feed === "맛객 추천" ? "반짝이 핀은 내 취향과 잘 맞는 맛객의 기록이에요." : "지도에서 장소별 맛객 기록을 살펴보세요."}
      </p>
      <div className="map-surface">
        <MapCanvas
          places={visible}
          subscriptions={subscriptions}
          liked={liked}
          recommendedTasterIds={recommendedTasterIds}
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
          <span className="grabber" />
          <div className="map-result-label">
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
              <FoodPhoto place={place} />
              <span>
                <h2>{place.name}</h2>
                <span className="map-place-meta">
                  <Rating count={place.recordCount} />
                  <small><Icon name="pin" />{place.address}</small>
                </span>
                <span className="small-tags">
                  <i>{place.category.split(" · ")[0]}</i>
                  <i>{place.tasters[0]?.tasterName ?? "공개 맛집"}</i>
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
        <p className="marker-guide-intro">맛객 추천 탭은 공개 맛객 기록을 모아 보여주고, 핀의 표식으로 취향이 맞는 맛객을 구분해요.</p>
        <div className="marker-guide-list">
          {[
            ["subscribed", "구독 중인 맛객", "코랄 핀에 맛다공 캐릭터가 보여요."],
            ["photo", "구독 중 · 프로필 사진", "같은 코랄 핀에 맛객 사진이 보여요."],
            ["other", "다른 맛객", "부드러운 주황 핀으로 구독하지 않은 맛객을 구분해요."],
            ["matched", "취향이 맞는 맛객", "눈에 띄는 보라색 핀과 반짝이로 취향 일치를 표시해요."],
            ["liked", "내 맛집", "저장했거나 직접 등록한 장소예요."],
            ["ad", "광고 맛집", "광고로 소개하는 장소예요."],
          ].map(([kind, title, description]) => <div className="marker-guide-row" key={kind}>
            <span className={`marker-guide-art marker-guide-art--${kind}`}>
              {kind === "subscribed" || kind === "photo" || kind === "other" || kind === "matched"
                ? <TasterMapMarker
                    kind={kind === "photo" ? "subscribed" : kind as "subscribed" | "other" | "matched"}
                    src={kind === "photo" ? "/assets/taster-profile-sample.png" : undefined}
                    name={kind === "photo" ? "맛객 프로필 사진 예시" : "맛다공 캐릭터"}
                  />
                : <span className={`map-category-marker map-category-marker--${kind}`} aria-hidden="true"><CategoryMarkerArtwork kind={kind as CategoryMarkerKind} /></span>}
            </span>
            <span><b>{title}</b><small>{description}</small></span>
          </div>)}
        </div>
      </Sheet>}
    </main>
  );
}
