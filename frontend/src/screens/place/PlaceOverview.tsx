import { placeNeighborhood, type Place } from "../../models/place";
import { categoryLabel, formatDistance } from "../../utils/format";

/**
 * 이름 아래 붙이는 나와의 관계 뱃지입니다. 내 지도·모음의 세 갈래(가볼 곳 · 가본 곳 · 공유 중)와 같은 뜻을
 * 상세에서는 "다녀온 곳"과 그 기록의 공유 상태(공유 중 · 나만 보기)로 풀어 씁니다.
 */
type PlaceStatus = "visited" | "shared" | "private" | "wish" | "disliked";

const STATUS_LABELS: Record<PlaceStatus, string> = {
  visited: "다녀온 곳",
  shared: "공유 중",
  private: "나만 보기",
  wish: "가볼 곳",
  disliked: "별로였어요",
};

/**
 * 붙일 뱃지입니다. 내 기록이 있으면 다녀온 곳 · 공유 중(또는 나만 보기), 별로였던 곳은 다녀온 곳 · 별로였어요,
 * 빠른 저장으로 다녀온 곳은 다녀온 곳, 아직 안 가 본 하트한 곳은 가볼 곳입니다(다녀온 곳이면 가볼 곳은 붙이지 않음).
 */
export function placeStatuses(state: {
  hasOwnRecord: boolean;
  isOwnPrivate: boolean;
  isDisliked: boolean;
  isVisited: boolean;
  isLiked: boolean;
}): PlaceStatus[] {
  if (state.hasOwnRecord) return ["visited", state.isOwnPrivate ? "private" : "shared"];
  if (state.isDisliked) return ["visited", "disliked"];
  if (state.isVisited) return ["visited"];
  return state.isLiked ? ["wish"] : [];
}

/**
 * 맛집 이름과 "분류 · 거리 · 동네" 한 줄, 나와의 관계 뱃지(statuses, placeStatuses로 만듦)입니다(보드 09-01).
 * 거리는 위치 권한이 있을 때만 보입니다. 주소·전화는 아래 "위치"(PlaceInfo)에, 길찾기는 고정 버튼 줄에, 하트는 위쪽 바에 둡니다.
 */
export default function PlaceOverview({
  place,
  distance,
  statuses,
}: {
  place: Place;
  /** 내 위치에서 가게까지 거리(m). 모르면 null입니다. */
  distance: number | null;
  statuses: PlaceStatus[];
}) {
  const meta = [categoryLabel(place.category), formatDistance(distance), placeNeighborhood(place)].filter(Boolean);

  return (
    <header className="r-place-title">
      <h1 className="r-display">{place.name}</h1>
      {meta.length > 0 && <p className="r-place-title__meta">{meta.join(" · ")}</p>}
      {statuses.length > 0 && (
        <div className="r-place-pills">
          {statuses.map((status) => (
            <span key={status} className={`r-place-pill is-${status}`}>
              {STATUS_LABELS[status]}
            </span>
          ))}
        </div>
      )}
    </header>
  );
}
