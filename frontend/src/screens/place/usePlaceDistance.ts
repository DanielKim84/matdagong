import { useEffect, useState } from "react";
import { useLocationPermission } from "../../hooks/useLocationPermission";
import type { Place } from "../../models/place";
import { currentPosition, distanceMeters, RECENT_POSITION_MS } from "../../utils/geo";

/**
 * 맛집 상세 "분류 · 거리 · 동네"(보드 09-01)의 거리(m)입니다. 위치 권한이 이미 허용된 때만 최근 위치로 재고,
 * 권한을 새로 묻지 않습니다. 모르면 null(거리 없이 보여 줌)입니다.
 */
export function usePlaceDistance(place: Pick<Place, "latitude" | "longitude">): number | null {
  const permission = useLocationPermission();
  const [distance, setDistance] = useState<number | null>(null);
  useEffect(() => {
    if (permission !== "granted") return;
    let active = true;
    currentPosition(RECENT_POSITION_MS).then(
      (position) => {
        if (active) setDistance(distanceMeters(position, place));
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [permission, place.latitude, place.longitude]);
  return distance;
}
