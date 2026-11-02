import { isCafeCategory, type Place } from "../models/place";
import { FoodPhoto } from "./BrandAssets";
import Icon from "./Icon";

/**
 * 장소 사진 칸입니다. 사진은 models/place.ts의 placePhoto()로 고른 값을 넘깁니다.
 * 사진이 없으면 fallback="photo"는 음식 그림(FoodPhoto), "icon"은 분류에 맞는 커피·포크 기호를 채웁니다.
 * 크기는 기본 64px이고, 영역 CSS에서 className으로 바꿉니다.
 */
export default function PlaceThumb({
  place,
  photo,
  fallback = "photo",
  className = "",
}: {
  place: Pick<Place, "id" | "category">;
  photo?: string;
  fallback?: "photo" | "icon";
  className?: string;
}) {
  return (
    <span className={`r-place-thumb ${photo ? "" : `r-place-thumb--${fallback}`} ${className}`}>
      {photo ? (
        <img src={photo} alt="" loading="lazy" decoding="async" />
      ) : fallback === "icon" ? (
        <Icon name={isCafeCategory(place.category) ? "coffee" : "fork"} />
      ) : (
        <FoodPhoto place={place} />
      )}
    </span>
  );
}
