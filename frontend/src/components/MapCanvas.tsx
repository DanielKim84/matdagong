/**
 * 카카오 지도 위에 맛집 마커·묶음 마커·내 위치를 그립니다. 발견·내 지도 화면과 맛객 프로필 지도가 함께 씁니다.
 * 마커 DOM은 mapMarkers.ts, 범위 계산은 mapFit.ts, 내 위치 확인은 useMyLocation이 맡고, 이 부품은 지도 상태(배율·강조·범위 맞추기)를 맡습니다.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadMapSdk } from "../services/kakao";
import type { MapKind, Place } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import type { Coordinates } from "../utils/geo";
import { MyPositionMarker } from "./BrandAssets";
import Icon from "./Icon";
import { fitMapToPlaces, fitMapToRadius } from "./mapFit";
import { CLUSTER_LEVEL, createClusterMarker, createPlaceMarker, groupPlacesByCell } from "./mapMarkers";
import { useMyLocation } from "./useMyLocation";

type Props = {
  places: Place[];
  subscriptions: string[];
  onSelect: (place: Place) => void;
  /** 지도가 멈출 때마다 보이는 범위를 알립니다. 강조 장소로 지도가 따라 움직인 경우 isFocusMove가 true입니다. */
  onBoundsChange?: (bounds: MapBounds, isFocusMove: boolean) => void;
  onPositionChange?: (position: Coordinates) => void;
  /** 강조할 장소. 바뀌면 그 마커를 키우고 지도 중심을 옮깁니다(발견·내 지도의 카드 선택). */
  focusedPlaceId?: string | null;
  /** 처음 그릴 때 받은 장소가 모두 보이도록 지도 범위를 맞춥니다(맛객 프로필 지도). */
  shouldFitToPlaces?: boolean;
  /** shouldFitToPlaces일 때 이 장소들만 꽉 차게 맞춥니다(핀은 places 전부 그대로). 없으면 places 전체에 맞춥니다(맛객 프로필의 지역 칩). */
  fitPlaces?: Place[];
  /** 내 위치를 가운데 두고 이 반경이 꼭 차게 지도를 맞춥니다(발견 화면의 반경 고르기). 그 뒤 확대·축소는 자유입니다. */
  radiusView?: RadiusView | null;
  /** 이 장소들이 모두 보이게 한 번 맞춥니다(발견 화면의 검색 결과). 그 뒤 확대·축소·이동은 자유입니다. */
  fitRequest?: FitRequest | null;
  /** 내 위치를 파란 점 대신 내 캐릭터로 보여 줄 때 넘깁니다(발견·내 지도). */
  me?: MapMe;
  /** 마커 종류를 직접 정합니다(내 지도: 내 기록·다녀온 곳·가볼 곳). 없으면 내 기록·구독 관계로 정합니다. */
  markerKindOf?: (place: Place) => MapKind;
};

export type MapMe = { name: string; variant: number };
/** requestId가 바뀔 때마다 한 번 맞춥니다. 같은 반경을 다시 골라도 다시 맞추기 위해서입니다. */
export type RadiusView = { meters: number; requestId: number };
/** requestId가 바뀔 때마다 places가 모두 보이게 한 번 맞춥니다. */
export type FitRequest = { places: Place[]; requestId: number };

const MAP_LOAD_ERROR = "지도를 불러오지 못했어요.";
// 위치를 모를 때 처음 보여 줄 중심(서울)과 기본 배율입니다.
const DEFAULT_CENTER = { latitude: 37.5642, longitude: 126.9254 };
const DEFAULT_LEVEL = 5;
// '내 위치' 버튼을 누르면 이 반경이 꼭 차게 지도를 맞춥니다(필터의 500m와 같은 범위).
const MY_LOCATION_RADIUS_METERS = 500;
// 내 위치 마커(높이 72px)에서 발밑 원의 가운데(위에서 64px)를 좌표에 맞춥니다. app.css의 .my-position-marker와 같은 값입니다.
const MY_MARKER_Y_ANCHOR = 64 / 72;
// CLUSTER_LEVEL(mapMarkers) 배율부터 개별 핀 대신 묶음 마커를, 이 배율부터는 마커를 그리지 않습니다(숫자가 클수록 넓게 봄).
const HIDE_MARKERS_LEVEL = 10;
// 묶음 마커를 누르면 이만큼 확대하되, 이 배율보다 더 가까이 가지는 않습니다.
const CLUSTER_ZOOM_STEP = 2;
const CLUSTER_ZOOM_CLOSEST_LEVEL = 4;
// 맛객 핀은 꼬리 끝이 좌표에 오도록 핀 높이보다 조금 아래(1.08)를 기준점으로 둡니다.
const PIN_Y_ANCHOR = 1.08;
// 겹칠 때 위에 오는 순서: 내 위치 > 강조한 장소 > 나머지 마커
const MY_MARKER_Z_INDEX = 20;
const FOCUSED_MARKER_Z_INDEX = 10;
// 강조 장소로 지도를 옮긴 뒤 이 시간 동안 오는 범위 변경은 사용자가 옮긴 것이 아니라고 알립니다.
const FOCUS_MOVE_HOLD_MS = 1000;

export default function MapCanvas({
  places,
  subscriptions,
  onSelect,
  onBoundsChange,
  onPositionChange,
  focusedPlaceId = null,
  shouldFitToPlaces = false,
  fitPlaces,
  radiusView = null,
  fitRequest = null,
  me,
  markerKindOf,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<MapInstance | null>(null);
  const selectCallback = useRef(onSelect);
  const boundsCallback = useRef(onBoundsChange);
  selectCallback.current = onSelect;
  boundsCallback.current = onBoundsChange;
  const kindOfRef = useRef(markerKindOf);
  kindOfRef.current = markerKindOf;
  const placesRef = useRef(places);
  placesRef.current = places;
  const focusedRef = useRef(focusedPlaceId);
  focusedRef.current = focusedPlaceId;
  // 장소 ID별 개별 마커입니다. 강조 상태를 마커를 다시 만들지 않고 바꿀 때 씁니다.
  const markers = useRef(new Map<string, { button: HTMLElement; overlay: MapOverlay }>());
  // 강조 장소로 지도를 옮기는 중인지. 이때의 범위 변경은 사용자가 지역을 바꾼 것이 아니라고 알립니다.
  const isFocusMove = useRef(false);
  const focusMoveTimer = useRef<number | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_LEVEL);
  // 내 위치 마커를 React로 그려 넣을 자리입니다. 지도 SDK가 이 요소를 오버레이로 붙입니다.
  const [meNode] = useState(() => document.createElement("div"));
  const hasMe = !!me;
  // '내 위치' 버튼을 눌렀을 때만 걸어서 갈 만한 주변(500m)이 보이게 확대합니다. 처음 자동 확인은 배율을 그대로 둡니다.
  const { position, locationMessage, locate } = useMyLocation({
    onPositionChange,
    onManualLocate: (next) => fitRadius(next, MY_LOCATION_RADIUS_METERS),
  });

  useEffect(() => {
    let active = true;
    loadMapSdk()
      .then(() => {
        if (!active || !element.current || !window.kakao) return;
        const maps = window.kakao.maps;
        const map = new maps.Map(element.current, {
          center: new maps.LatLng(DEFAULT_CENTER.latitude, DEFAULT_CENTER.longitude),
          level: DEFAULT_LEVEL,
          draggable: true,
          zoomable: true,
        });
        map.setDraggable(true);
        map.setZoomable(true);
        instance.current = map;
        maps.event.addListener(map, "idle", () => {
          boundsCallback.current?.(map.getBounds(), isFocusMove.current);
          setZoomLevel(map.getLevel());
        });
        maps.event.addListener(map, "dragstart", () => {
          isFocusMove.current = false;
        });
        // 처음 범위도 바로 알립니다. idle은 타일을 다 그린 뒤에야 와서, 그 전까지 화면이 지역과 상관없는 목록을 보이지 않게 합니다.
        requestAnimationFrame(() => {
          map.relayout();
          boundsCallback.current?.(map.getBounds(), false);
        });
        setIsReady(true);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause, MAP_LOAD_ERROR));
      });
    return () => {
      active = false;
      instance.current = null;
      window.clearTimeout(focusMoveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!isReady || !element.current) return;
    const observer = new ResizeObserver(() => instance.current?.relayout());
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [isReady]);

  useEffect(() => {
    const map = instance.current,
      maps = window.kakao?.maps;
    if (!isReady || !map || !maps) return;
    const overlays: MapOverlay[] = [];
    const placeMarkers = markers.current;
    // 가까이 볼 때는 개별 핀, 축소하면 격자 단위 묶음, 가장 넓게 볼 때는 마커를 숨깁니다.
    if (zoomLevel >= HIDE_MARKERS_LEVEL) return;
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
      placeMarkers.set(place.id, { button, overlay });
      if (place.id === focusedRef.current) {
        button.classList.add("is-focused");
        overlay.setZIndex(FOCUSED_MARKER_Z_INDEX);
      }
    });
    return () => {
      overlays.forEach((overlay) => overlay.setMap(null));
      placeMarkers.clear();
    };
  }, [places, subscriptions, isReady, zoomLevel]);

  // 강조할 장소가 바뀌면 그 마커만 키우고, 묶음으로 보이는 배율이면 개별 핀이 보이게 확대한 뒤 중심을 옮깁니다.
  useEffect(() => {
    const map = instance.current,
      maps = window.kakao?.maps;
    markers.current.forEach(({ button, overlay }, placeId) => {
      const isFocused = placeId === focusedPlaceId;
      button.classList.toggle("is-focused", isFocused);
      overlay.setZIndex(isFocused ? FOCUSED_MARKER_Z_INDEX : 0);
    });
    if (!isReady || !map || !maps || !focusedPlaceId) return;
    const place = placesRef.current.find((item) => item.id === focusedPlaceId);
    if (!place) return;
    // 옮기는 동안 idle이 여러 번 올 수 있어 잠시 동안(또는 사용자가 지도를 끌 때까지) 표시를 유지합니다.
    isFocusMove.current = true;
    window.clearTimeout(focusMoveTimer.current);
    focusMoveTimer.current = window.setTimeout(() => (isFocusMove.current = false), FOCUS_MOVE_HOLD_MS);
    if (map.getLevel() >= CLUSTER_LEVEL) map.setLevel(DEFAULT_LEVEL);
    const center = new maps.LatLng(place.latitude, place.longitude);
    map.panTo(center);
  }, [focusedPlaceId, isReady]);

  // 장소 구성이 바뀔 때만 모두 보이게 맞춥니다(사용자가 옮긴 지도를 다시 그릴 때마다 되돌리지 않음). 한 곳뿐이면 그곳을 가운데 둡니다.
  const fitTargets = fitPlaces ?? places;
  const fitTargetsRef = useRef(fitTargets);
  fitTargetsRef.current = fitTargets;
  const fitKey = shouldFitToPlaces ? fitTargets.map((place) => place.id).join(",") : "";
  useEffect(() => {
    if (shouldFitToPlaces && isReady) fitAll(fitTargetsRef.current);
  }, [shouldFitToPlaces, fitKey, isReady]);

  const fitRequestId = fitRequest?.requestId;
  useEffect(() => {
    if (fitRequest && isReady) fitAll(fitRequest.places);
    // 요청 번호가 바뀔 때만 맞춥니다. 같은 결과로 다시 그릴 때마다 사용자가 옮긴 지도를 되돌리지 않습니다.
  }, [fitRequestId, isReady]);

  /** places가 모두 보이게 맞춥니다. 한 곳뿐이면 동네가 보이는 기본 배율로 가까이 가져갑니다. */
  function fitAll(places: Place[]) {
    const map = instance.current,
      maps = window.kakao?.maps;
    if (map && maps) fitMapToPlaces(map, maps, places, DEFAULT_LEVEL);
  }

  function fitRadius(center: Coordinates, meters: number) {
    const map = instance.current,
      maps = window.kakao?.maps;
    if (map && maps) fitMapToRadius(map, maps, center, meters);
  }

  const radiusRequestId = radiusView?.requestId;
  useEffect(() => {
    if (!radiusView || !isReady || !position) return;
    fitRadius(position, radiusView.meters);
    // 반경은 요청 번호가 바뀔 때만 맞춥니다. 위치가 조금 바뀌었다고 사용자가 옮긴 지도를 되돌리지 않습니다.
  }, [radiusRequestId, isReady]);

  useEffect(() => {
    const map = instance.current,
      maps = window.kakao?.maps;
    if (!isReady || !map || !maps || !position) return;
    // 내 위치는 넘겨받은 캐릭터(없으면 점)로 보여 줍니다. 발밑 원의 가운데가 좌표입니다.
    const overlay = new maps.CustomOverlay({
      map,
      position: new maps.LatLng(position.latitude, position.longitude),
      content: hasMe ? meNode : '<span class="position-dot"></span>',
      yAnchor: hasMe ? MY_MARKER_Y_ANCHOR : 0.5,
      zIndex: hasMe ? MY_MARKER_Z_INDEX : 0,
    });
    // 맛객 프로필 지도처럼 기록한 곳 전체를 맞춰 보여 주는 지도는 처음 내 위치를 찾아도 옮기지 않습니다(점만 표시).
    // '내 위치' 버튼을 누르면 locate가 따로 옮깁니다.
    if (!shouldFitToPlaces) {
      map.setCenter(new maps.LatLng(position.latitude, position.longitude));
      // 내 위치로 옮긴 범위를 idle을 기다리지 않고 알려, 카드·목록이 처음부터 내 주변 기준이 되게 합니다.
      boundsCallback.current?.(map.getBounds(), false);
    }
    return () => overlay.setMap(null);
  }, [isReady, position, hasMe, meNode, shouldFitToPlaces]);

  return (
    <>
      <div ref={element} className="map-canvas" aria-label="카카오 맛집 지도" />
      {error && (
        <div className="map-error" role="alert">
          {error}
        </div>
      )}
      <div className="map-location">
        <button type="button" onClick={locate} aria-label="내 위치로 이동">
          <Icon name="locate" />
          <span className="map-location__label" aria-hidden="true">
            내 위치
          </span>
        </button>
        {locationMessage && <small role="status">{locationMessage}</small>}
      </div>
      {me && createPortal(<MyPositionMarker {...me} />, meNode)}
    </>
  );
}
