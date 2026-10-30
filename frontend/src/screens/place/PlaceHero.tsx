import { useEffect, useRef, useState } from "react";
import type { Place } from "../../models/place";
import { loadMapSdk } from "../../services/kakao";
import Icon from "../../components/Icon";
import { hasCoordinates, type PlacePhoto } from "./placeRecords";

/** 상단 큰 사진. 사진이 없으면 가게 위치 지도를 보여 줍니다. */
export default function PlaceHero({ place, photos, onOpenPhoto }: {
  place: Place;
  photos: PlacePhoto[];
  onOpenPhoto: (index: number) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  function onScroll() {
    const element = track.current;
    if (!element || !element.clientWidth) return;
    setIndex(Math.round(element.scrollLeft / element.clientWidth));
  }

  if (!photos.length) return <div className="r-place-hero r-place-hero--map"><PlaceMap place={place} /></div>;

  return (
    <div className="r-place-hero">
      <div className="r-place-hero__track" ref={track} onScroll={onScroll}>
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
      {photos.length > 1 && <span className="r-place-hero__count" aria-hidden="true">{Math.min(index, photos.length - 1) + 1} / {photos.length}</span>}
    </div>
  );
}

/** 움직이지 않는 작은 위치 지도입니다. 지도를 불러오지 못하면 주소만 보여 줍니다. */
function PlaceMap({ place }: { place: Place }) {
  const element = useRef<HTMLDivElement>(null);
  const { latitude, longitude } = place;
  const [error, setError] = useState(!hasCoordinates({ latitude, longitude }));

  useEffect(() => {
    if (!hasCoordinates({ latitude, longitude })) return;
    let active = true;
    let overlay: MapOverlay | undefined;
    loadMapSdk()
      .then(() => {
        const maps = window.kakao?.maps;
        if (!active || !element.current || !maps) return;
        const center = new maps.LatLng(latitude, longitude);
        const map = new maps.Map(element.current, { center, level: 3, draggable: false, zoomable: false });
        const pin = document.createElement("span");
        pin.className = "r-place-map-pin";
        pin.setAttribute("aria-hidden", "true");
        overlay = new maps.CustomOverlay({ map, position: center, content: pin, yAnchor: 1 });
        requestAnimationFrame(() => {
          map.relayout();
          map.setCenter(center);
        });
      })
      .catch(() => { if (active) setError(true); });
    return () => {
      active = false;
      overlay?.setMap(null);
    };
  }, [latitude, longitude]);

  if (error) {
    return (
      <div className="r-place-hero__placeholder">
        <Icon name="pin" />
        <span>{place.address || "위치 정보가 없어요"}</span>
      </div>
    );
  }
  return <div className="r-place-hero__map" ref={element} role="img" aria-label={`${place.name} 위치 지도`} />;
}
