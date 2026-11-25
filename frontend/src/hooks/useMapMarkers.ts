import { useEffect, useRef } from "react";
import { CLUSTER_LEVEL, createClusterMarker, createPlaceMarker, groupPlacesByCell } from "../components/mapMarkers";
import type { MapKind, Place } from "../models/place";

const CLUSTER_ZOOM_STEP = 2;
const CLUSTER_ZOOM_CLOSEST_LEVEL = 4;
const FOCUSED_MARKER_Z_INDEX = 10;
const PIN_Y_ANCHOR = 1.08;

/** 지도 위의 맛집·묶음 마커를 그리며, 카드 선택에 맞춰 강조합니다. */
export function useMapMarkers({
  map,
  maps,
  places,
  subscriptions,
  onSelect,
  focusedPlaceId,
  markerKindOf,
  zoomLevel,
  isReady,
}: {
  map: MapInstance | null;
  maps: Kakao["maps"] | undefined;
  places: Place[];
  subscriptions: string[];
  onSelect: (place: Place) => void;
  focusedPlaceId: string | null;
  markerKindOf?: (place: Place) => MapKind;
  zoomLevel: number;
  isReady: boolean;
}): void {
  const markers = useRef(new Map<string, { button: HTMLElement; overlay: MapOverlay }>());
  const selectCallback = useRef(onSelect);
  const kindOfRef = useRef(markerKindOf);
  const focusedRef = useRef(focusedPlaceId);
  selectCallback.current = onSelect;
  kindOfRef.current = markerKindOf;
  focusedRef.current = focusedPlaceId;

  useEffect(() => {
    if (!isReady || !map || !maps) return;
    const overlays: MapOverlay[] = [];

    if (zoomLevel >= CLUSTER_LEVEL) {
      groupPlacesByCell(places, zoomLevel).forEach((group) => {
        const center = new maps.LatLng(group.latitude, group.longitude);
        const button = createClusterMarker(group.count);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          map.setCenter(center);
          map.setLevel(Math.max(CLUSTER_ZOOM_CLOSEST_LEVEL, zoomLevel - CLUSTER_ZOOM_STEP), { animate: true });
        });
        overlays.push(new maps.CustomOverlay({ map, position: center, content: button, yAnchor: 0.5 }));
      });
      return () => overlays.forEach((overlay) => overlay.setMap(null));
    }

    places.forEach((place) => {
      const button = createPlaceMarker(place, subscriptions, kindOfRef.current?.(place));
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        selectCallback.current(place);
      });
      const overlay = new maps.CustomOverlay({
        map,
        position: new maps.LatLng(place.latitude, place.longitude),
        content: button,
        yAnchor: PIN_Y_ANCHOR,
      });
      overlays.push(overlay);
      markers.current.set(place.id, { button, overlay });
      if (place.id === focusedRef.current) {
        button.classList.add("is-focused");
        overlay.setZIndex(FOCUSED_MARKER_Z_INDEX);
      }
    });

    return () => {
      overlays.forEach((overlay) => overlay.setMap(null));
      markers.current.clear();
    };
  }, [isReady, map, maps, places, subscriptions, zoomLevel]);

  useEffect(() => {
    markers.current.forEach(({ button, overlay }, placeId) => {
      const isFocused = placeId === focusedPlaceId;
      button.classList.toggle("is-focused", isFocused);
      overlay.setZIndex(isFocused ? FOCUSED_MARKER_Z_INDEX : 0);
    });
  }, [focusedPlaceId]);
}
