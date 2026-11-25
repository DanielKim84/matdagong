import { useEffect, useRef, useState } from "react";
import Icon from "../../components/Icon";
import { loadMapSdk } from "../../services/kakao";
import type { Place } from "../../models/place";
import { hasCoordinates } from "./placeRecords";

/**
 * 움직이지 않는 작은 위치 지도와 코랄 핀입니다(맛집 상세의 "위치" 칸, 사진이 없을 때의 큰 사진 자리).
 * 지도를 불러오지 못하거나 좌표가 없으면 주소만 보여 줍니다.
 */
export default function PlaceMiniMap({ place, className = "" }: { place: Place; className?: string }) {
  const element = useRef<HTMLDivElement>(null);
  const { latitude, longitude } = place;
  const [hasError, setHasError] = useState(!hasCoordinates({ latitude, longitude }));

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
      .catch(() => {
        if (active) setHasError(true);
      });
    return () => {
      active = false;
      overlay?.setMap(null);
    };
  }, [latitude, longitude]);

  if (hasError) {
    return (
      <div className={`r-place-minimap r-place-minimap--empty ${className}`}>
        <Icon name="pin" />
        <span>{place.address || "위치 정보가 없어요"}</span>
      </div>
    );
  }
  return (
    <div className={`r-place-minimap ${className}`} ref={element} role="img" aria-label={`${place.name} 위치 지도`} />
  );
}
