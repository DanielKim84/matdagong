import Icon from "../../components/Icon";
import type { Place } from "../../models/place";
import { kakaoPlaceUrl, openDirections } from "../../utils/placeLinks";
import { hasCoordinates } from "./placeRecords";

/** 이름 옆에 붙이는 나와의 관계 뱃지입니다. */
type PlaceStatus = "mine" | "visited" | "wish" | "disliked";

const STATUS_LABELS: Record<PlaceStatus, string> = {
  mine: "내가 다녀온 곳",
  visited: "다녀온 곳",
  wish: "가볼 곳",
  disliked: "별로였어요",
};

/**
 * 붙일 뱃지입니다. 내 기록이 있으면 그것만 붙입니다. 별로였던 곳은 직접 다녀온 곳이라 다녀온 곳 · 별로였어요를 함께,
 * 그 밖에는 다녀온 곳·가볼 곳을 붙입니다(가볼 곳에 하트한 뒤 가서 빠른 저장한 곳은 둘 다). 별로였어요를 고르면 하트가 지워져 가볼 곳과는 겹치지 않습니다.
 */
export function placeStatuses(state: {
  hasOwnRecord: boolean;
  isDisliked: boolean;
  isVisited: boolean;
  isLiked: boolean;
}): PlaceStatus[] {
  if (state.hasOwnRecord) return ["mine"];
  if (state.isDisliked) return ["visited", "disliked"];
  return [state.isVisited && "visited", state.isLiked && "wish"].filter((status): status is PlaceStatus => !!status);
}

/**
 * 맛집 이름·분류·주소와 나와의 관계 뱃지(statuses, placeStatuses로 만듦), 길찾기·전화 버튼입니다.
 * 저장(하트)과 기록 남기기·수정은 아래 고정 버튼 줄에만 둡니다(같은 동작 버튼을 한 화면에 여러 번 두지 않음).
 */
export default function PlaceOverview({ place, statuses }: { place: Place; statuses: PlaceStatus[] }) {
  const phone = place.providerPhone?.trim();

  return (
    <>
      <header className="r-place-title">
        <h1 className="r-display">{place.name}</h1>
        <div className="r-place-pills">
          {place.category && <span className="r-place-pill">{place.category}</span>}
          {statuses.map((status) => (
            <span key={status} className={`r-place-pill ${status === "disliked" ? "is-disliked" : "is-mine"}`}>
              {STATUS_LABELS[status]}
            </span>
          ))}
        </div>
        {place.address && (
          <p className="r-place-address">
            <Icon name="pin" />
            <span>{place.address}</span>
            <a href={kakaoPlaceUrl(place)} target="_blank" rel="noreferrer">
              카카오맵
            </a>
          </p>
        )}
      </header>

      <nav className="r-place-quick" aria-label="가게 연결">
        <button
          type="button"
          className="r-place-quick__item"
          onClick={() => openDirections(place)}
          disabled={!hasCoordinates(place)}
        >
          <Icon name="route" />
          길찾기
        </button>
        {phone ? (
          <a className="r-place-quick__item" href={`tel:${phone}`} aria-label={`전화 걸기 ${phone}`}>
            <Icon name="phone" />
            전화하기
          </a>
        ) : (
          <button type="button" className="r-place-quick__item" disabled aria-label="전화번호 정보 없음">
            <Icon name="phone" />
            전화번호 없음
          </button>
        )}
      </nav>
    </>
  );
}
