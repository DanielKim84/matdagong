import Icon from "../../components/Icon";
import type { Place } from "../../models/place";
import { kakaoPlaceUrl, openDirections } from "../../utils/placeLinks";
import { hasCoordinates } from "./placeRecords";

/**
 * 맛집 이름·분류·주소와 길찾기·전화 버튼입니다. 저장(하트)과 기록 남기기·수정은 아래 고정 버튼 줄에만 둡니다
 * (같은 동작 버튼을 한 화면에 여러 번 두지 않음).
 */
export default function PlaceOverview({
  place,
  isLiked,
  isVisitedLike,
  hasOwnRecord,
}: {
  place: Place;
  isLiked: boolean;
  /** 하트가 다녀왔어요(입맛에 맞았어요)인지. 아니면 가볼 곳입니다. */
  isVisitedLike: boolean;
  hasOwnRecord: boolean;
}) {
  const phone = place.providerPhone?.trim();

  return (
    <>
      <header className="r-place-title">
        <h1 className="r-display">{place.name}</h1>
        <div className="r-place-pills">
          {place.category && <span className="r-place-pill">{place.category}</span>}
          {place.visibility === "private" && <span className="r-place-pill">비공개 기록</span>}
          {hasOwnRecord && <span className="r-place-pill is-mine">내가 다녀온 곳</span>}
          {!hasOwnRecord && isLiked && (
            <span className="r-place-pill is-mine">{isVisitedLike ? "다녀온 곳" : "가볼 곳"}</span>
          )}
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
