import { useState } from "react";
import type { MapKind, Place } from "../models/place";
import { go } from "../app/navigation";
import { BrandArt, FoodPhoto } from "../components/BrandAssets";
import { FeedTabs } from "../components/AppChrome";
import MapCanvas from "../components/MapCanvas";
import Sheet from "../components/Sheet";
import Icon from "../components/Icon";
import { Rating } from "../components/PlaceTile";

type Props = {
  places: Place[];
  subscriptions: string[];
  query: string;
  onQuery: (value: string) => void;
  loading: boolean;
  error: string;
};
const options: {
  kind: MapKind;
  name: string;
  icon: "fork" | "user";
  color: string;
}[] = [
  {
    kind: "subscribed",
    name: "내 구독 맛객의 맛집",
    icon: "fork",
    color: "#8A4CFF",
  },
  { kind: "other", name: "다른 맛객들의 맛집", icon: "fork", color: "#FF4F36" },
  { kind: "ad", name: "광고 맛집 (업체 등록)", icon: "user", color: "#8A4CFF" },
];

export default function MapScreen({
  places,
  subscriptions,
  query,
  onQuery,
  loading,
  error,
}: Props) {
  const [feed, setFeed] = useState("추천");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<MapKind[]>([
    "subscribed",
    "other",
    "ad",
  ]);
  const [draft, setDraft] = useState<MapKind[]>(filters);
  const [listOpen, setListOpen] = useState(false);
  let visible = places.filter((place) =>
    filters.includes(
      place.tasters.some((taster) => subscriptions.includes(taster.tasterId))
        ? "subscribed"
        : "other",
    ),
  );
  if (feed === "구독")
    visible = visible.filter((place) =>
      place.tasters.some((taster) => subscriptions.includes(taster.tasterId)),
    );
  if (feed === "광고 맛집") visible = [];
  return (
    <main className="map-screen">
      <div className="map-toolbar">
        <label className="search-input">
          <Icon name="search" />
          <input
            aria-label="이 지역 맛집 검색"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="이 지역 맛집 검색"
          />
          {query && (
            <button aria-label="검색어 삭제" onClick={() => onQuery("")}>
              <Icon name="close" />
            </button>
          )}
        </label>
        <button
          className="icon-button"
          aria-label="지도 표시 설정"
          onClick={() => {
            setDraft(filters);
            setFilterOpen(true);
          }}
        >
          <Icon name="filter" />
        </button>
      </div>
      <FeedTabs value={feed} onChange={setFeed} />
      <div className="map-surface">
        <MapCanvas
          places={visible}
          subscriptions={subscriptions}
          onSelect={(place) => go("place", place.id)}
        />
        <button
          className="map-list-button"
          onClick={() => setListOpen(!listOpen)}
        >
          <Icon name={listOpen ? "pin" : "list"} />
          {listOpen ? "지도로 보기" : "목록보기"}
        </button>
        {loading && (
          <span className="map-loading">주변 맛집을 불러오고 있어요…</span>
        )}
      </div>
      <section className={`map-bottom-card ${listOpen ? "expanded" : ""}`}>
        <span className="grabber" />
        <div className="map-result-label">
          <b>
            주변 맛집 <em>{visible.length}</em>
          </b>
          <span>이 지역의 맛있는 발견</span>
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
                  <small>
                    <Icon name="locate" />
                    0.3km
                  </small>
                </span>
                <span className="small-tags">
                  <i>{place.category.split(" · ")[0]}</i>
                  <i>맛객 추천</i>
                  <i>동네 맛집</i>
                </span>
              </span>
              <Icon name="chevron" />
            </button>
          ))
        ) : (
          <p className="map-list-message">이 조건에 맞는 맛집이 아직 없어요.</p>
        )}
      </section>
      {filterOpen && (
        <Sheet
          title="지도 표시 설정"
          className="map-filter"
          onClose={() => setFilterOpen(false)}
        >
          <div className="filter-toggles">
            {options.map((option) => (
              <label key={option.kind}>
                <span
                  className="filter-symbol"
                  style={{ background: option.color }}
                >
                  <Icon name={option.icon} />
                </span>
                <span>{option.name}</span>
                <input
                  type="checkbox"
                  className="switch"
                  checked={draft.includes(option.kind)}
                  onChange={(event) =>
                    setDraft(
                      event.target.checked
                        ? [...draft, option.kind]
                        : draft.filter((item) => item !== option.kind),
                    )
                  }
                />
              </label>
            ))}
          </div>
          <h3>지도 마커 안내</h3>
          <div className="pin-guide">
            <div>
              <BrandArt name="purplePin" />
              <b>구독 맛객</b>
              <small>(기본 마커)</small>
            </div>
            <div>
              <BrandArt name="photoPin" />
              <b>구독 맛객</b>
              <small>
                (프로필 사진
                <br />
                적용 시)
              </small>
            </div>
            <div>
              <BrandArt name="adPin" />
              <b>광고 맛집</b>
              <small>(업체 등록)</small>
            </div>
          </div>
          <div className="filter-note">
            <span>
              <BrandArt name="redPin" />
              <b>다른 맛객의 맛집</b>
            </span>
            <p>
              구독하지 않은 맛객의 맛집은
              <br />
              빨간색 기본 마커로 보여요.
            </p>
          </div>
          <button
            className="primary-button filter-apply"
            onClick={() => {
              setFilters(draft);
              setFilterOpen(false);
            }}
          >
            적용하기
          </button>
        </Sheet>
      )}
    </main>
  );
}
