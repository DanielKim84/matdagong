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
    <article className="place-tile">
      <div className="tile-photo">
        <button
          className="photo-link"
          onClick={() => go("place", place.id)}
          aria-label={`${place.name} 상세`}
        >
          {photo ? (
            <img src={photo} alt={place.name} loading="lazy" decoding="async" />
          ) : (
            <FoodPhoto place={place} />
          )}
        </button>
        <button
          className={`photo-heart ${liked ? "is-liked" : ""}`}
          onClick={onLike}
          aria-label={liked ? "내 맛집에서 삭제" : "내 맛집에 추가"}
          aria-pressed={liked}
        >
          <Icon name="heart" filled={liked} />
        </button>
      </div>
      <button
        className="tile-description"
        onClick={() => go("place", place.id)}
      >
        <h3>{place.name}</h3>
        <Rating count={place.recordCount} />
        <span className="tile-place-category">{place.category} · {place.address}</span>
        <span className="tile-place-note">{place.recentNote || "맛객이 남긴 추천 기록을 확인해 보세요."}</span>
      </button>
    </article>
  );
}
