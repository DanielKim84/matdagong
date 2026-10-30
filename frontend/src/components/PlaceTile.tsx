import { go } from "../app/navigation";
import type { Place } from "../models/place";
import { FoodPhoto } from "./BrandAssets";
import Icon from "./Icon";

export function Rating({ count }: { count: number }) {
  return (
    <span className="rating">
      <Icon name="user" />
      <small>추천한 맛객 {count}명</small>
    </span>
  );
}

/** 모음 화면의 장소 카드: 사진, 이름, 분류·주소, 저장(하트) 버튼. */
export default function PlaceTile({
  place,
  liked,
  onLike,
  photo,
  meta,
}: {
  place: Place;
  liked: boolean;
  onLike: () => void;
  photo?: string;
  /** 사진 아래 작은 글씨(예: "어제 봄"). 없으면 추천 맛객 수를 보여 줍니다. */
  meta?: string;
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
          <em>{meta ?? `추천한 맛객 ${place.recordCount}명`}</em>
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
