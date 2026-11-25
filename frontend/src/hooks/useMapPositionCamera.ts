import { useEffect, useRef } from "react";
import { fitMapToRadius } from "../components/mapFit";
import type { RadiusView } from "../models/map";
import type { Coordinates } from "../utils/geo";

const MY_LOCATION_RADIUS_METERS = 500;

/** 위치 확인·반경 선택 때 지도 카메라를 한 번만 이동합니다. */
export function useMapPositionCamera({
  map,
  maps,
  isReady,
  position,
  radiusView,
  centerOffsetY,
  hasRestoredCamera,
  manualLocateRequest,
  shouldFitToPlaces,
  onBoundsChange,
}: {
  map: MapInstance | null;
  maps: Kakao["maps"] | undefined;
  isReady: boolean;
  position: Coordinates | null;
  radiusView: RadiusView | null;
  centerOffsetY: number;
  hasRestoredCamera: { current: boolean };
  manualLocateRequest: { current: Coordinates | null };
  shouldFitToPlaces: boolean;
  onBoundsChange?: (bounds: MapBounds, isFocusMove: boolean, isUserMove: boolean) => void;
}) {
  const pendingCenterOffset = useRef<number | null>(null);
  const centerOffsetRef = useRef(centerOffsetY);
  const boundsCallback = useRef(onBoundsChange);
  const manuallyFittedPosition = useRef<Coordinates | null>(null);
  const hasInitialPositionCamera = useRef(false);
  const initialRadiusRequestId = useRef(radiusView?.requestId ?? null);
  const skippedInitialRadius = useRef(false);
  centerOffsetRef.current = centerOffsetY;
  boundsCallback.current = onBoundsChange;

  function fitRadius(center: Coordinates, meters: number) {
    if (!map || !maps) return;
    pendingCenterOffset.current = centerOffsetRef.current;
    fitMapToRadius(map, maps, center, meters);
  }

  useEffect(() => {
    if (!isReady || !position || manualLocateRequest.current !== position) return;
    manualLocateRequest.current = null;
    manuallyFittedPosition.current = position;
    hasInitialPositionCamera.current = true;
    fitRadius(position, MY_LOCATION_RADIUS_METERS);
  }, [isReady, position, map, maps]);

  const radiusRequestId = radiusView?.requestId;
  useEffect(() => {
    if (!isReady || !position) return;
    if (manuallyFittedPosition.current === position) {
      manuallyFittedPosition.current = null;
      return;
    }
    if (!radiusView || manualLocateRequest.current === position) return;
    if (
      hasRestoredCamera.current &&
      !skippedInitialRadius.current &&
      initialRadiusRequestId.current !== null &&
      radiusView.requestId === initialRadiusRequestId.current
    ) {
      skippedInitialRadius.current = true;
      return;
    }
    skippedInitialRadius.current = true;
    fitRadius(position, radiusView.meters);
    // 위치가 갱신돼도 반경 선택이 그대로면, 사용자가 옮긴 카메라를 되돌리지 않습니다.
  }, [radiusRequestId, isReady, position, map, maps]);

  useEffect(() => {
    if (!isReady || !position || !map || !maps || shouldFitToPlaces || hasRestoredCamera.current || radiusView) return;
    if (manualLocateRequest.current === position || hasInitialPositionCamera.current) return;
    hasInitialPositionCamera.current = true;
    pendingCenterOffset.current = centerOffsetRef.current;
    map.setCenter(new maps.LatLng(position.latitude, position.longitude));
    boundsCallback.current?.(map.getBounds(), false, false);
  }, [isReady, position, map, maps, shouldFitToPlaces, radiusView]);

  return { pendingCenterOffset };
}
