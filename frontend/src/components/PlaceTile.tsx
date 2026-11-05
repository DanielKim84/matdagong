import { go } from "../app/navigation";
import type { Place } from "../models/place";
import { FoodPhoto } from "./BrandAssets";
import Icon from "./Icon";

/** 모음 화면의 장소 카드: 사진, 이름, 분류·주소, 저장(하트) 버튼. */
export default function PlaceTile({
  place,
  liked,
  onLike,
  photo,
}: {
  place: Place;
  liked: boolean;
  onLike: () => void;
  photo?: string;
}) {
  return (
    <article className="r-card r-me-place">
      <button type="button" className="r-me-place__open" onClick={() => go("place", place.id)}>
        <span className="r-me-place__photo">
          {photo ? <img src={photo} alt="" loading="lazy" decoding="async" /> : <FoodPhoto place={place} />}
        </span>
        <span className="r-me-place__copy">
          <b>{place.name}</b>
          <small>{[place.category, place.address].filter(Boolean).join(" · ")}</small>
          <em>추천한 맛객 {place.recordCount}명</em>
        </span>
      </button>
      <button
        type="button"
        className={`r-me-place__like ${liked ? "is-on" : ""}`}
        onClick={onLike}
        aria-label={liked ? `${place.name} 저장 취소` : `${place.name} 저장`}
        aria-pressed={liked}
      >
        <Icon name="heart" filled={liked} />
      </button>
    </article>
  );
}
