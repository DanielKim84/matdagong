import Icon from "../../components/Icon";
import type { Place } from "../../models/place";
import { kakaoPlaceUrl, openDirections } from "../../utils/placeLinks";
import { hasCoordinates } from "./placeRecords";

/** 맛집 이름·분류·주소와 길찾기·저장·전화·기록 빠른 동작 줄입니다. */
export default function PlaceOverview({
  place,
  isLiked,
  hasOwnRecord,
  saveLabel,
  recordAction,
  onSave,
}: {
  place: Place;
  isLiked: boolean;
  hasOwnRecord: boolean;
  saveLabel: string;
  recordAction: { short: string; run: () => void };
  onSave: () => void;
}) {
  const phone = place.providerPhone?.trim();

  return (
    <>
      <header className="r-place-title">
        <h1 className="r-display">{place.name}</h1>
        <div className="r-place-pills">
          {place.category && <span className="r-place-pill">{place.category}</span>}
          {place.visibility === "private" && <span className="r-place-pill">비공개 기록</span>}
          {hasOwnRecord && <span className="r-place-pill is-accent">내가 다녀온 곳</span>}
          {!hasOwnRecord && isLiked && <span className="r-place-pill is-accent">내 맛집</span>}
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

      <nav className="r-place-quick" aria-label="빠른 동작">
        <button
          type="button"
          className="r-place-quick__item"
          onClick={() => openDirections(place)}
          disabled={!hasCoordinates(place)}
        >
          <span className="r-place-quick__icon is-primary">
            <Icon name="route" />
          </span>
          길찾기
        </button>
        <button
          type="button"
          className={`r-place-quick__item ${isLiked ? "is-on" : ""}`}
          onClick={onSave}
          aria-pressed={isLiked}
          aria-label={saveLabel}
        >
          <span className="r-place-quick__icon">
            <Icon name="heart" filled={isLiked} />
          </span>
          {isLiked ? "저장됨" : "저장"}
        </button>
        {phone ? (
          <a className="r-place-quick__item" href={`tel:${phone}`} aria-label={`전화 걸기 ${phone}`}>
            <span className="r-place-quick__icon">
              <Icon name="phone" />
            </span>
            전화
          </a>
        ) : (
          <button type="button" className="r-place-quick__item" disabled aria-label="전화번호 정보 없음">
            <span className="r-place-quick__icon">
              <Icon name="phone" />
            </span>
            전화
          </button>
        )}
        <button type="button" className="r-place-quick__item" onClick={recordAction.run}>
          <span className="r-place-quick__icon">
            <Icon name="book" />
          </span>
          {recordAction.short}
        </button>
      </nav>
    </>
  );
}
