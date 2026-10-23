import { go } from "../app/navigation";
import type { Place } from "../models/place";
import { FoodPhoto } from "./BrandAssets";
import Icon from "./Icon";

export function Rating({ count }: { count: number }) {
  return (
    <span className="rating">
      <Icon name="star" filled />
      <b>4.8</b>
      <small>({count})</small>
    </span>
  );
}

export default function PlaceTile({
  place,
  saved,
  onSave,
  photo,
}: {
  place: Place;
  saved: boolean;
  onSave: () => void;
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
            <img src={photo} alt={place.name} />
          ) : (
            <FoodPhoto place={place} />
          )}
        </button>
        <button
          className={`photo-heart ${saved ? "is-saved" : ""}`}
          onClick={onSave}
          aria-label={saved ? "스크랩 취소" : "맛집 스크랩"}
          aria-pressed={saved}
        >
          <Icon name="heart" filled={saved} />
        </button>
      </div>
      <button
        className="tile-description"
        onClick={() => go("place", place.id)}
      >
        <h3>{place.name}</h3>
        <Rating count={place.recordCount} />
      </button>
    </article>
  );
}
