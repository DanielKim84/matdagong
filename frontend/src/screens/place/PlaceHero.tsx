import { useRef, useState } from "react";
import PaginationDots from "../../components/PaginationDots";
import type { Place } from "../../models/place";
import PlaceMiniMap from "./PlaceMiniMap";
import type { PlacePhoto } from "./placeRecords";

/**
 * 상단 큰 사진(고른 맛객이 올린 대표 사진, 보드 09-01). 옆으로 넘기고, 사진 아래 점으로 몇 번째인지 보여 줍니다.
 * 누구의 사진인지는 바로 아래 맛객 줄이 알려 주므로 사진 위에 글자·숫자를 얹지 않습니다(보드: 이미지 위 숫자 배지 없음).
 * 사진이 없으면 가게 위치 지도를 보여 줍니다.
 */
export default function PlaceHero({
  place,
  photos,
  onOpenPhoto,
}: {
  place: Place;
  photos: PlacePhoto[];
  onOpenPhoto: (index: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function syncIndex() {
    const element = track.current;
    if (!element || !element.clientWidth) return;
    setIndex(Math.round(element.scrollLeft / element.clientWidth));
  }
  function scrollTo(next: number) {
    const element = track.current;
    if (element) element.scrollTo({ left: next * element.clientWidth, behavior: "smooth" });
  }

  if (!photos.length)
    return (
      <div className="r-place-hero r-place-hero--map">
        <PlaceMiniMap place={place} />
      </div>
    );

  return (
    <div className="r-place-hero">
      <div className="r-place-hero__track" ref={track} onScroll={syncIndex}>
        {photos.map((photo, photoIndex) => (
          <button
            type="button"
            key={photo.src}
            className="r-place-hero__slide"
            onClick={() => onOpenPhoto(photoIndex)}
            aria-label={`${photo.record.tasterName}님이 올린 ${place.name} 사진 ${photoIndex + 1}, 크게 보기`}
          >
            <img src={photo.src} alt="" loading={photoIndex < 2 ? "eager" : "lazy"} decoding="async" />
          </button>
        ))}
      </div>
      {photos.length > 1 && (
        <PaginationDots
          activeIndex={Math.min(index, photos.length - 1)}
          total={photos.length}
          onSelect={scrollTo}
          label="사진"
        />
      )}
    </div>
  );
}
