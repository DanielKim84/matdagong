import type { VisibleBounds } from "./discoverModel";

/** 지도 마커와 아래 장소 목록이 같은 지도 영역을 계산하도록 Kakao 경계를 그대로 씁니다. */
export function mapBoundsOf(bounds: MapBounds): VisibleBounds {
  const southWest = bounds.getSouthWest();
  const northEast = bounds.getNorthEast();
  return {
    south: southWest.getLat(),
    west: southWest.getLng(),
    north: northEast.getLat(),
    east: northEast.getLng(),
  };
}

// 핀 마커 크기(app.css의 .map-category-marker·.taster-map-marker, 43×53px). 핀 끝이 장소 좌표입니다.
const MARKER_WIDTH_PX = 43;
const MARKER_HEIGHT_PX = 53;
/** 마커가 이만큼 이상 지도 안에 보여야 "지도에 보이는 곳"으로 셉니다. */
const VISIBLE_MARKER_RATIO = 2 / 3;

/**
 * 지도 경계를 마커가 2/3 이상 보이는 범위로 줄입니다(발견·내 지도의 "지도에 보이는 곳" 목록·수).
 * 핀은 좌표 위로 솟으므로 위쪽은 마커 높이의 2/3, 양옆은 마커 폭의 1/6만큼 안쪽으로 당깁니다.
 * 지도 크기(px)를 모르면 경계를 그대로 씁니다. 지도 핀 자체는 원래 경계로 그립니다.
 */
export function markerVisibleBounds(
  bounds: VisibleBounds,
  size: { width: number; height: number } | null,
): VisibleBounds {
  if (!size?.width || !size.height) return bounds;
  const latPerPx = (bounds.north - bounds.south) / size.height;
  const lngPerPx = (bounds.east - bounds.west) / size.width;
  const side = MARKER_WIDTH_PX * (VISIBLE_MARKER_RATIO - 0.5) * lngPerPx;
  return {
    south: bounds.south,
    north: bounds.north - MARKER_HEIGHT_PX * VISIBLE_MARKER_RATIO * latPerPx,
    west: bounds.west + side,
    east: bounds.east - side,
  };
}
