import { useState, type FormEvent } from "react";
import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import PlaceThumb from "../../components/PlaceThumb";
import SubScreen from "../../components/SubScreen";
import { EmptyState } from "../../components/ui";
import { placeNeighborhood, placePhoto, type Place } from "../../models/place";
import { searchKakaoPlaces } from "../../services/kakao";
import { errorMessage } from "../../utils/errorMessage";
import { categoryLabel, formatDistance, formatNumber } from "../../utils/format";
import { distanceMeters, kakaoPlaceAddress, kakaoPlaceCoordinates, type Coordinates } from "../../utils/geo";
import { knownPlaceOf, MY_PLACE_CATEGORY_LABELS, myLeadTaster, type MyPlaceCategory } from "./myMapModel";
import type { PlaceContext } from "../discover/discoverModel";

const SEARCH_MIN_LENGTH = 2;

type Row = {
  key: string;
  name: string;
  place?: Place;
  meta: string;
  /** 가게 줄 아래 회색 알약("맛다공 기록 6건", "기록 없음") 또는 내 장소 갈래 이름표 */
  badge: { label: string; category?: MyPlaceCategory };
  onSelect: () => void;
};

/**
 * 내 지도 전체 장소(보드 06-04, 전체 화면 "장소 검색"): 회색 검색창 아래 가게 줄(사진 · 이름 · "분류 · 동네 · 거리" ·
 * "맛다공 기록 N건 / 기록 없음" · 오른쪽 코랄 "선택")입니다. 검색어가 없으면 내 장소 전부(가볼 곳·가본 곳·공유 중)를,
 * 검색하면 카카오맵처럼 지역과 상관없이 모든 가게를 보여 주고, 고르면 맛집 상세를 엽니다(맛다공에 없는 가게는 카카오 가게 정보로).
 */
export default function MyPlacesScreen({
  myPlaces,
  categories,
  knownPlaces,
  ctx,
  device,
  onOpenPlace,
  onOpenKakao,
  onMarkerGuide,
  onClose,
}: {
  myPlaces: Place[];
  categories: Map<string, MyPlaceCategory>;
  /** 맛다공에 있는 가게(검색 결과를 맛다공 장소로 잇기 위해) */
  knownPlaces: Place[];
  ctx: PlaceContext;
  device: Coordinates | null;
  onOpenPlace: (place: Place) => void;
  onOpenKakao: (result: KakaoPlaceResult) => void;
  onMarkerGuide: () => void;
  onClose: () => void;
}) {
  const { photoFor } = useAppData();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlaceResult[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const distance = (target: Coordinates) => (device ? formatDistance(distanceMeters(device, target)) : "");

  async function search(event: FormEvent) {
    event.preventDefault();
    const keyword = query.trim();
    if (keyword.length < SEARCH_MIN_LENGTH) {
      setError("가게 이름이나 지역을 두 글자 이상 입력해 주세요.");
      return;
    }
    setIsSearching(true);
    setError("");
    try {
      setResults(await searchKakaoPlaces(keyword));
    } catch (cause) {
      setError(errorMessage(cause, "가게를 찾지 못했어요. 잠시 후 다시 시도해 주세요."));
      setResults(null);
    } finally {
      setIsSearching(false);
    }
  }

  function clear() {
    setQuery("");
    setResults(null);
    setError("");
  }

  const rows: Row[] = results
    ? results.map((result) => {
        const known = knownPlaceOf(result, knownPlaces);
        return {
          key: result.id,
          name: result.place_name,
          place: known,
          meta: [
            categoryLabel(result.category_name),
            placeNeighborhood({ address: kakaoPlaceAddress(result), lotAddress: null }),
            distance(kakaoPlaceCoordinates(result)),
          ]
            .filter(Boolean)
            .join(" · "),
          badge: { label: known?.recordCount ? `맛다공 기록 ${formatNumber(known.recordCount)}건` : "기록 없음" },
          onSelect: () => (known ? onOpenPlace(known) : onOpenKakao(result)),
        };
      })
    : myPlaces.map((place) => {
        const category = categories.get(place.id) ?? "wish";
        return {
          key: place.id,
          name: place.name,
          place,
          meta: [categoryLabel(place.category), placeNeighborhood(place), distance(place)].filter(Boolean).join(" · "),
          badge: { label: MY_PLACE_CATEGORY_LABELS[category], category },
          onSelect: () => onOpenPlace(place),
        };
      });

  return (
    <SubScreen title="장소 검색" onClose={onClose} className="r-my-places">
      <form className="r-search-field" role="search" onSubmit={(event) => void search(event)}>
        <Icon name="search" />
        <span className="visually-hidden">가게 검색</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="가게 이름이나 지역 (예: 연남동 파스타)"
          enterKeyHint="search"
        />
        {query && (
          <button type="button" className="r-search-field__clear" aria-label="검색어 지우기" onClick={clear}>
            <Icon name="close" />
          </button>
        )}
      </form>

      <p className="r-my-places__count">
        <span>
          {isSearching ? "찾는 중…" : results ? `전체 장소 결과 ${rows.length}곳` : `내 장소 ${rows.length}곳`}
        </span>
        {!results && (
          <button type="button" className="r-text-button" onClick={onMarkerGuide}>
            마커 안내
          </button>
        )}
      </p>
      {error && (
        <p className="r-error-box" role="alert">
          {error}
        </p>
      )}

      {rows.length ? (
        <ul className="r-my-places__list">
          {rows.map((row) => (
            <li key={row.key}>
              {row.place ? (
                <PlaceThumb
                  place={row.place}
                  photo={placePhoto(row.place, myLeadTaster(row.place, ctx), photoFor(row.place.id))}
                  fallback="icon"
                  className="r-my-places__thumb"
                />
              ) : (
                <span className="r-my-places__thumb is-empty" aria-hidden="true">
                  <Icon name="image" />
                  <small>사진 없음</small>
                </span>
              )}
              <span className="r-my-places__copy">
                <b>{row.name}</b>
                <small>{row.meta}</small>
                <em className={row.badge.category ? `r-mymap-tag is-${row.badge.category}` : ""}>{row.badge.label}</em>
              </span>
              <button type="button" className="r-my-places__pick" onClick={row.onSelect}>
                선택
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !isSearching && (
          <EmptyState
            icon="pin"
            title={results ? `‘${query.trim()}’에 맞는 가게가 없어요` : "아직 내 지도에 표시할 곳이 없어요"}
            message={
              results
                ? "지역 이름을 함께 넣어 보세요."
                : "가고 싶은 가게를 찾아 하트를 누르면 가볼 곳으로 저장돼요. 다녀온 곳은 기록해 보세요."
            }
          />
        )
      )}
    </SubScreen>
  );
}
