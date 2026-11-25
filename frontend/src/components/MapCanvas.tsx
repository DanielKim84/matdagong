/**
 * 카카오 지도 위에 맛집 마커·묶음 마커·내 위치를 그립니다. 발견·내 지도 화면과 맛객 프로필 지도가 함께 씁니다.
 * 마커 DOM은 mapMarkers.ts, 범위 계산은 mapFit.ts, 내 위치 확인은 useMyLocation이 맡고, 이 부품은 지도 상태(배율·강조·범위 맞추기)를 맡습니다.
 */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MyPositionMarker } from "./BrandAssets";
import Icon from "./Icon";
import { fitMapToPlaces, offsetKakaoMapForVisibleArea } from "./mapFit";
import { CLUSTER_LEVEL } from "./mapMarkers";
import { useMapMarkers } from "../hooks/useMapMarkers";
import { useMapPositionCamera } from "../hooks/useMapPositionCamera";
import { useMyLocation } from "../hooks/useMyLocation";
import { loadMapSdk } from "../services/kakao";
import type { MapCanvasProps } from "../models/map";
import type { Place } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import type { Coordinates } from "../utils/geo";
import { readMapCamera, saveMapCamera } from "../utils/mapCamera";

const MAP_LOAD_ERROR = "지도를 불러오지 못했어요.";
// 위치를 모를 때 처음 보여 줄 중심(서울)과 기본 배율입니다.
const DEFAULT_CENTER = { latitude: 37.5642, longitude: 126.9254 };
const DEFAULT_LEVEL = 5;
// 내 위치 마커(높이 72px)에서 발밑 원의 가운데(위에서 64px)를 좌표에 맞춥니다. app.css의 .my-position-marker와 같은 값입니다.
const MY_MARKER_Y_ANCHOR = 64 / 72;
// 겹칠 때 위에 오는 순서: 내 위치 > 강조한 장소 > 나머지 마커
const MY_MARKER_Z_INDEX = 20;
// 강조 장소로 지도를 옮긴 뒤 이 시간 동안 오는 범위 변경은 사용자가 옮긴 것이 아니라고 알립니다.
const FOCUS_MOVE_HOLD_MS = 1000;
// 휠 확대·축소는 dragstart가 오지 않으므로, 사용자 입력 판정은 짧은 시간만 보관합니다.
const USER_MAP_MOVE_HOLD_MS = 1500;

export default function MapCanvas({
  places,
  subscriptions,
  onSelect,
  onBoundsChange,
  onPositionChange,
  onManualLocate,
  focusedPlaceId = null,
  shouldFitToPlaces = false,
  fitPlaces,
  radiusView = null,
  fitRequest = null,
  centerRequest = null,
  me,
  markerKindOf,
  cameraKey,
  restoreCamera = true,
  centerOffsetY = 0,
}: MapCanvasProps) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<MapInstance | null>(null);
  const boundsCallback = useRef(onBoundsChange);
  boundsCallback.current = onBoundsChange;
  const focusedPlace = focusedPlaceId ? places.find((place) => place.id === focusedPlaceId) : undefined;
  // 강조 장소로 지도를 옮기는 중인지. 이때의 범위 변경은 사용자가 지역을 바꾼 것이 아니라고 알립니다.
  const isFocusMove = useRef(false);
  const isUserMapMove = useRef(false);
  const hasRestoredCamera = useRef(false);
  const manualLocateRequest = useRef<Coordinates | null>(null);
  const focusMoveTimer = useRef<number | undefined>(undefined);
  const userMapMoveTimer = useRef<number | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState("");
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_LEVEL);
  // 내 위치 마커를 React로 그려 넣을 자리입니다. 지도 SDK가 이 요소를 오버레이로 붙입니다.
  const [meNode] = useState(() => document.createElement("div"));
  const hasMe = !!me;
  // '내 위치' 버튼을 눌렀을 때만 걸어서 갈 만한 주변(500m)이 보이게 확대합니다. 처음 자동 확인은 배율을 그대로 둡니다.
  const { position, locationMessage, locate } = useMyLocation({
    onPositionChange,
    onManualLocate: (next) => {
      isFocusMove.current = false;
      isUserMapMove.current = false;
      window.clearTimeout(focusMoveTimer.current);
      window.clearTimeout(userMapMoveTimer.current);
      manualLocateRequest.current = next;
      onManualLocate?.();
    },
  });
  const map = instance.current;
  const maps = window.kakao?.maps;
  const { pendingCenterOffset } = useMapPositionCamera({
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
  });

  useEffect(() => {
    let active = true;
    let layoutFrame: number | undefined;
    let mapElement: HTMLDivElement | null = null;
    const markUserMapMove = () => {
      isFocusMove.current = false;
      isUserMapMove.current = true;
      window.clearTimeout(userMapMoveTimer.current);
      userMapMoveTimer.current = window.setTimeout(() => (isUserMapMove.current = false), USER_MAP_MOVE_HOLD_MS);
    };
    const markUserPinch = (event: TouchEvent) => {
      if (event.touches.length > 1) markUserMapMove();
    };
    loadMapSdk()
      .then(() => {
        if (!active || !element.current || !window.kakao) return;
        mapElement = element.current;
        mapElement.addEventListener("wheel", markUserMapMove, { passive: true });
        mapElement.addEventListener("touchmove", markUserPinch, { passive: true });
        const maps = window.kakao.maps;
        const savedCamera = restoreCamera ? readMapCamera(cameraKey) : null;
        hasRestoredCamera.current = !!savedCamera;
        const map = new maps.Map(element.current, {
          center: new maps.LatLng(
            savedCamera?.latitude ?? DEFAULT_CENTER.latitude,
            savedCamera?.longitude ?? DEFAULT_CENTER.longitude,
          ),
          level: savedCamera?.level ?? DEFAULT_LEVEL,
          draggable: true,
          zoomable: true,
        });
        map.setDraggable(true);
        map.setZoomable(true);
        instance.current = map;
        setZoomLevel(map.getLevel());
        maps.event.addListener(map, "idle", () => {
          if (!active) return;
          if (pendingCenterOffset.current !== null) {
            const offset = pendingCenterOffset.current;
            pendingCenterOffset.current = null;
            if (offset) {
              // 중심 좌표를 보이는 영역 쪽으로 내리면, 그 기준인 내 위치는 화면에서 위로 이동합니다.
              offsetKakaoMapForVisibleArea(map, offset);
              return;
            }
          }
          const center = map.getCenter();
          saveMapCamera(cameraKey, { latitude: center.getLat(), longitude: center.getLng(), level: map.getLevel() });
          boundsCallback.current?.(map.getBounds(), isFocusMove.current, isUserMapMove.current);
          isUserMapMove.current = false;
          window.clearTimeout(userMapMoveTimer.current);
          setZoomLevel(map.getLevel());
        });
        maps.event.addListener(map, "dragstart", () => {
          if (!active) return;
          markUserMapMove();
        });
        // 처음 범위도 바로 알립니다. idle은 타일을 다 그린 뒤에야 와서, 그 전까지 화면이 지역과 상관없는 목록을 보이지 않게 합니다.
        layoutFrame = requestAnimationFrame(() => {
          if (!active) return;
          map.relayout();
          boundsCallback.current?.(map.getBounds(), false, false);
        });
        setIsReady(true);
      })
      .catch((cause: unknown) => {
        if (active) setError(errorMessage(cause, MAP_LOAD_ERROR));
      });
    return () => {
      active = false;
      mapElement?.removeEventListener("wheel", markUserMapMove);
      mapElement?.removeEventListener("touchmove", markUserPinch);
      if (layoutFrame !== undefined) cancelAnimationFrame(layoutFrame);
      if (instance.current) {
        const center = instance.current.getCenter();
        saveMapCamera(cameraKey, {
          latitude: center.getLat(),
          longitude: center.getLng(),
          level: instance.current.getLevel(),
        });
      }
      instance.current = null;
      window.clearTimeout(focusMoveTimer.current);
      window.clearTimeout(userMapMoveTimer.current);
    };
  }, [cameraKey, restoreCamera]);

  useEffect(() => {
    if (!isReady || !element.current) return;
    const observer = new ResizeObserver(() => instance.current?.relayout());
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [isReady]);

  useMapMarkers({ map, maps, places, subscriptions, onSelect, focusedPlaceId, markerKindOf, zoomLevel, isReady });

  useEffect(() => {
    if (!isReady || !map || !maps || !focusedPlaceId) return;
    if (!focusedPlace) return;
    // 옮기는 동안 idle이 여러 번 올 수 있어 잠시 동안(또는 사용자가 지도를 끌 때까지) 표시를 유지합니다.
    isFocusMove.current = true;
    window.clearTimeout(focusMoveTimer.current);
    focusMoveTimer.current = window.setTimeout(() => (isFocusMove.current = false), FOCUS_MOVE_HOLD_MS);
    const center = new maps.LatLng(focusedPlace.latitude, focusedPlace.longitude);
    pendingCenterOffset.current = null;
    // 묶음 마커로 보이는 배율이면 고른 곳의 핀이 숫자 묶음에 숨으므로, 핀이 따로 보이는 배율까지 당겨 가운데 둡니다(목록에서 고를 때).
    if (map.getLevel() >= CLUSTER_LEVEL) {
      map.setLevel(CLUSTER_LEVEL - 1);
      map.setCenter(center);
      return;
    }
    map.panTo(center);
  }, [focusedPlaceId, isReady, focusedPlace?.latitude, focusedPlace?.longitude]);

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
    if (!fitRequest || !isReady) return;
    // 숨겨 두었다가 막 보인 지도(발견 검색 결과의 "지도 보기")는 크기를 아직 모르므로 먼저 다시 잽니다.
    instance.current?.relayout();
    fitAll(fitRequest.places);
    // 요청 번호가 바뀔 때만 맞춥니다. 같은 결과로 다시 그릴 때마다 사용자가 옮긴 지도를 되돌리지 않습니다.
  }, [fitRequestId, isReady]);

  // 지역 선택: 고른 지역 가운데로 배율을 맞춰 옮깁니다. 요청 번호가 바뀔 때만 옮겨, 그 뒤 사용자가 옮긴 지도를 되돌리지 않습니다.
  const centerRequestId = centerRequest?.requestId;
  useEffect(() => {
    const map = instance.current,
      maps = window.kakao?.maps;
    if (!centerRequest || !isReady || !map || !maps) return;
    map.setLevel(centerRequest.level);
    map.setCenter(new maps.LatLng(centerRequest.center.latitude, centerRequest.center.longitude));
  }, [centerRequestId, isReady]);

  /** places가 모두 보이게 맞춥니다. 한 곳뿐이면 동네가 보이는 기본 배율로 가까이 가져갑니다. */
  function fitAll(places: Place[]) {
    const map = instance.current,
      maps = window.kakao?.maps;
    if (map && maps) {
      fitMapToPlaces(map, maps, places, DEFAULT_LEVEL);
    }
  }

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
    return () => overlay.setMap(null);
  }, [isReady, position, hasMe, meNode]);

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
