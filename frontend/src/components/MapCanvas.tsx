import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadMapSdk } from "../services/kakao";
import { MY_TASTER_ID, type MapKind, type Place } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import type { Coordinates } from "../utils/geo";
import { MyPositionMarker } from "./BrandAssets";
import Icon from "./Icon";
import { LOCK_BADGE_SVG, MARKER_SHELL_PATH, categoryMarkerHtml } from "./mapMarkerArt";

type Props = {
  places: Place[];
  subscriptions: string[];
  liked?: string[];
  recommendedTasterIds?: string[];
  onSelect: (place: Place) => void;
  /** 지도가 멈출 때마다 보이는 범위를 알립니다. 강조 장소로 지도가 따라 움직인 경우 isFocusMove가 true입니다. */
  onBoundsChange?: (bounds: MapBounds, isFocusMove: boolean) => void;
  onPick?: (position: Coordinates) => void;
  onPositionChange?: (position: Coordinates) => void;
  selected?: Coordinates | null;
  /** 강조할 장소. 바뀌면 그 마커를 키우고 지도 중심을 옮깁니다(발견 화면의 카드 선택). */
  focusedPlaceId?: string | null;
  /** 처음 그릴 때 받은 장소가 모두 보이도록 지도 범위를 맞춥니다(맛객 프로필 지도). */
  fitToPlaces?: boolean;
  /** 내 위치를 파란 점 대신 내 캐릭터로 보여 줄 때 넘깁니다(발견 화면). */
  me?: MapMe;
};

export type MapMe = { name: string; variant: number };

const MAP_LOAD_ERROR = "지도를 불러오지 못했어요.";
// 내 위치 마커(높이 72px)에서 발밑 원의 가운데(위에서 64px)를 좌표에 맞춥니다. app.css의 .my-position-marker와 같은 값입니다.
const MY_MARKER_Y_ANCHOR = 64 / 72;

export default function MapCanvas({
  places,
  subscriptions,
  liked = [],
  recommendedTasterIds = [],
  onSelect,
  onBoundsChange,
  onPick,
  onPositionChange,
  selected,
  focusedPlaceId = null,
  fitToPlaces = false,
  me,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<MapInstance | null>(null);
  const pickCallback = useRef(onPick);
  const selectCallback = useRef(onSelect);
  const boundsCallback = useRef(onBoundsChange);
  const positionCallback = useRef(onPositionChange);
  pickCallback.current = onPick;
  selectCallback.current = onSelect;
  boundsCallback.current = onBoundsChange;
  positionCallback.current = onPositionChange;
  const placesRef = useRef(places);
  placesRef.current = places;
  const focusedRef = useRef(focusedPlaceId);
  focusedRef.current = focusedPlaceId;
  // 장소 ID별 개별 마커입니다. 강조 상태를 마커를 다시 만들지 않고 바꿀 때 씁니다.
  const markers = useRef(new Map<string, { button: HTMLElement; overlay: MapOverlay }>());
  // 강조 장소로 지도를 옮기는 중인지. 이때의 범위 변경은 사용자가 지역을 바꾼 것이 아니라고 알립니다.
  const isFocusMove = useRef(false);
  const focusMoveTimer = useRef<number | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [zoomLevel, setZoomLevel] = useState(5);
  // 내 위치 마커를 React로 그려 넣을 자리입니다. 지도 SDK가 이 요소를 오버레이로 붙입니다.
  const [meNode] = useState(() => document.createElement("div"));
  const hasMe = !!me;

  useEffect(() => {
    let active = true;
    loadMapSdk()
      .then(() => {
        if (!active || !element.current || !window.kakao) return;
        const maps = window.kakao.maps;
        const map = new maps.Map(element.current, {
          center: new maps.LatLng(37.5642, 126.9254),
          level: 5,
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
        maps.event.addListener(map, "click", (event) => {
          if (event)
            pickCallback.current?.({
              latitude: event.latLng.getLat(),
              longitude: event.latLng.getLng(),
            });
        });
        requestAnimationFrame(() => map.relayout());
        setReady(true);
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

  // 지도를 열면 현재 위치로 중심을 옮겨 주변 기록을 먼저 보여줍니다. 권한이 없으면 안내 없이 기본 중심을 유지합니다.
  useEffect(() => {
    locate(false);
  }, []);

  useEffect(() => {
    if (!ready || !element.current) return;
    const observer = new ResizeObserver(() => instance.current?.relayout());
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [ready]);

  useEffect(() => {
    const map = instance.current,
      maps = window.kakao?.maps;
    if (!ready || !map || !maps) return;
    const overlays: MapOverlay[] = [];
    const placeMarkers = markers.current;
    const remember = (place: Place, button: HTMLElement, overlay: MapOverlay) => {
      placeMarkers.set(place.id, { button, overlay });
      if (place.id === focusedRef.current) {
        button.classList.add("is-focused");
        overlay.setZIndex(10);
      }
    };
    // 가까이 볼 때는 개별 핀, 축소하면 격자 단위 묶음(광고 제외), 가장 넓게 볼 때는 마커를 숨깁니다.
    if (zoomLevel >= 10) return;
    if (zoomLevel >= 7) {
      const cellSize = 0.018 * 2 ** (zoomLevel - 7);
      const groups = new Map<string, { latitude: number; longitude: number; count: number }>();
      places
        .filter((place) => !place.advertisement)
        .forEach((place) => {
          const row = Math.floor(place.latitude / cellSize);
          const column = Math.floor(place.longitude / cellSize);
          const key = `${row}:${column}`;
          const group = groups.get(key) ?? { latitude: 0, longitude: 0, count: 0 };
          group.latitude += place.latitude;
          group.longitude += place.longitude;
          group.count += 1;
          groups.set(key, group);
        });
      groups.forEach((group) => {
        const center = new maps.LatLng(group.latitude / group.count, group.longitude / group.count);
        const button = document.createElement("button");
        button.type = "button";
        button.className = "map-cluster-marker";
        button.setAttribute("aria-label", `맛집 ${group.count}곳이 모인 곳`);
        button.textContent = String(group.count);
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          map.setCenter(center);
          map.setLevel(Math.max(4, zoomLevel - 2), { animate: true });
        });
        overlays.push(new maps.CustomOverlay({ map, position: center, content: button, yAnchor: 0.5 }));
      });
      return () => overlays.forEach((overlay) => overlay.setMap(null));
    }
    places.forEach((place) => {
      const subscribedTaster = place.tasters.find((taster) => subscriptions.includes(taster.tasterId));
      const matchedTaster = place.tasters.find((taster) => recommendedTasterIds.includes(taster.tasterId));
      const fallbackTaster = place.tasters.find((taster) => taster.tasterId !== MY_TASTER_ID) ?? {
        tasterId: "sample-taster",
        tasterName: "맛객",
        tag: "",
        avatar: "",
        avatarVariant: 1,
        note: "",
      };
      // 내 기록, 좋아요, 구독, 취향 일치 관계를 계정 데이터로 판단해 마커를 정확히 나눕니다.
      const isMyRecord =
        place.visibility === "private" || place.tasters.some((taster) => taster.tasterId === MY_TASTER_ID);
      const kind: MapKind = isMyRecord
        ? "own"
        : liked.includes(place.id)
          ? "liked"
          : place.advertisement
            ? "ad"
            : subscribedTaster
              ? subscribedTaster.avatar
                ? "subscribedPhoto"
                : "subscribed"
              : place.tasters.some((taster) => recommendedTasterIds.includes(taster.tasterId))
                ? "matched"
                : "other";
      const markerRole =
        kind === "subscribed" || kind === "subscribedPhoto"
          ? "subscribed"
          : kind === "matched"
            ? "matched"
            : kind === "other"
              ? "other"
              : kind === "own"
                ? "own"
                : null;
      const markerTaster =
        markerRole === "subscribed"
          ? (subscribedTaster ?? fallbackTaster)
          : markerRole === "matched"
            ? (matchedTaster ?? fallbackTaster)
            : markerRole === "other"
              ? (place.tasters.find(
                  (taster) => taster.tasterId !== MY_TASTER_ID && !subscriptions.includes(taster.tasterId),
                ) ?? fallbackTaster)
              : markerRole === "own"
                ? (place.tasters.find((taster) => taster.tasterId === MY_TASTER_ID) ?? fallbackTaster)
                : undefined;
      if (markerRole && markerTaster) {
        // 내 기록 중 나만 보기는 같은 보라 핀에 자물쇠 표식으로 구분합니다.
        const isPrivateOwn =
          markerRole === "own" && (place.visibility === "private" || markerTaster.visibility === "PRIVATE");
        const button = document.createElement("button");
        button.type = "button";
        button.className = `taster-map-marker taster-map-marker--${markerRole}${isPrivateOwn ? " is-private" : ""}`;
        button.setAttribute(
          "aria-label",
          `${markerRole === "own" ? (isPrivateOwn ? "나만 보는 내 기록" : "내가 등록한") : markerRole === "other" ? `구독하지 않은 ${markerTaster.tasterName} 맛객이 추천한` : `${markerTaster.tasterName} 맛객이 추천한`} ${place.name}`,
        );
        const shell = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        shell.setAttribute("class", "taster-map-marker-shell");
        shell.setAttribute("viewBox", "0 0 43 53");
        shell.setAttribute("aria-hidden", "true");
        const shellPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        shellPath.setAttribute("d", MARKER_SHELL_PATH);
        shell.append(shellPath);
        const face = document.createElement("span");
        face.className = "taster-map-marker-face";
        const hasUploadedPhoto = markerTaster.avatar && !/^demo-avatar:\d$/.test(markerTaster.avatar);
        if (hasUploadedPhoto) {
          const image = document.createElement("img");
          image.className = "taster-map-marker-avatar";
          image.src = markerTaster.avatar;
          image.alt = "";
          face.append(image);
        } else {
          // 프로필 사진이 없을 때는 관계별 포즈가 있는 맛다공 캐릭터를 사용합니다.
          const roleVariant =
            markerRole === "subscribed"
              ? 4
              : markerRole === "matched"
                ? 7
                : markerRole === "own"
                  ? markerTaster.avatarVariant
                  : 1;
          const variant = Math.min(10, Math.max(1, roleVariant || markerTaster.avatarVariant || 1));
          const column = (variant - 1) % 5;
          const row = Math.floor((variant - 1) / 5);
          const avatar = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          avatar.setAttribute("viewBox", `${column * 396.6} ${row * 396.5} 396.6 396.5`);
          avatar.setAttribute("aria-hidden", "true");
          avatar.setAttribute("preserveAspectRatio", "xMidYMid slice");
          const sprite = document.createElementNS("http://www.w3.org/2000/svg", "image");
          sprite.setAttribute("href", "/assets/avatars/matdagong-characters-v1.png");
          sprite.setAttribute("width", "1983");
          sprite.setAttribute("height", "793");
          avatar.append(sprite);
          face.append(avatar);
        }
        button.append(shell, face);
        if (markerRole !== "other") {
          const badge = document.createElement("span");
          badge.className = "taster-map-marker-badge";
          badge.setAttribute("aria-hidden", "true");
          if (isPrivateOwn) badge.innerHTML = LOCK_BADGE_SVG;
          else badge.textContent = markerRole === "subscribed" ? "♥" : markerRole === "own" ? "✓" : "✦";
          button.append(badge);
        }
        button.addEventListener("click", (event) => {
          event.stopPropagation();
          selectCallback.current(place);
        });
        const overlay = new maps.CustomOverlay({
          map,
          position: new maps.LatLng(place.latitude, place.longitude),
          content: button,
          yAnchor: 1.08,
        });
        overlays.push(overlay);
        remember(place, button, overlay);
        return;
      }
      // 내 맛집과 광고 장소는 맛객 얼굴 대신 각 상태를 나타내는 기호로 표시합니다.
      const button = document.createElement("button");
      button.type = "button";
      button.className = `map-category-marker map-category-marker--${kind}`;
      button.setAttribute("aria-label", `${kind} · ${place.name}`);
      button.innerHTML = categoryMarkerHtml(kind);
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        selectCallback.current(place);
      });
      const overlay = new maps.CustomOverlay({
        map,
        position: new maps.LatLng(place.latitude, place.longitude),
        content: button,
        yAnchor: 1.08,
      });
      overlays.push(overlay);
      remember(place, button, overlay);
    });
    return () => {
      overlays.forEach((overlay) => overlay.setMap(null));
      placeMarkers.clear();
    };
  }, [places, subscriptions, liked, recommendedTasterIds, ready, zoomLevel]);

  // 강조할 장소가 바뀌면 그 마커만 키우고, 묶음으로 보이는 배율이면 개별 핀이 보이게 확대한 뒤 중심을 옮깁니다.
  useEffect(() => {
    const map = instance.current,
      maps = window.kakao?.maps;
    markers.current.forEach(({ button, overlay }, placeId) => {
      const isFocused = placeId === focusedPlaceId;
      button.classList.toggle("is-focused", isFocused);
      overlay.setZIndex(isFocused ? 10 : 0);
    });
    if (!ready || !map || !maps || !focusedPlaceId) return;
    const place = placesRef.current.find((item) => item.id === focusedPlaceId);
    if (!place) return;
    // 옮기는 동안 idle이 여러 번 올 수 있어 잠시 동안(또는 사용자가 지도를 끌 때까지) 표시를 유지합니다.
    isFocusMove.current = true;
    window.clearTimeout(focusMoveTimer.current);
    focusMoveTimer.current = window.setTimeout(() => (isFocusMove.current = false), 1000);
    if (map.getLevel() >= 7) map.setLevel(5);
    const center = new maps.LatLng(place.latitude, place.longitude);
    map.panTo(center);
  }, [focusedPlaceId, ready]);

  // 장소 구성이 바뀔 때만 모두 보이게 맞춥니다(사용자가 옮긴 지도를 다시 그릴 때마다 되돌리지 않음). 한 곳뿐이면 그곳을 가운데 둡니다.
  const fitKey = fitToPlaces ? places.map((place) => place.id).join(",") : "";
  useEffect(() => {
    const places = placesRef.current;
    const map = instance.current,
      maps = window.kakao?.maps;
    if (!fitToPlaces || !ready || !map || !maps || !places.length) return;
    if (places.length === 1) {
      map.setCenter(new maps.LatLng(places[0].latitude, places[0].longitude));
      return;
    }
    const bounds = new maps.LatLngBounds();
    places.forEach((place) => bounds.extend(new maps.LatLng(place.latitude, place.longitude)));
    map.setBounds(bounds);
  }, [fitToPlaces, fitKey, ready]);

  useEffect(() => {
    const map = instance.current,
      maps = window.kakao?.maps;
    const coordinates = selected ?? position;
    if (!ready || !map || !maps || !coordinates) return;
    // 고른 지점(기록하기)은 점으로, 내 위치는 넘겨받은 캐릭터로 보여 줍니다. 발밑 원의 가운데가 좌표입니다.
    const showsMe = hasMe && !selected;
    const overlay = new maps.CustomOverlay({
      map,
      position: new maps.LatLng(coordinates.latitude, coordinates.longitude),
      content: showsMe ? meNode : '<span class="position-dot"></span>',
      yAnchor: showsMe ? MY_MARKER_Y_ANCHOR : 0.5,
      zIndex: showsMe ? 20 : 0,
    });
    if (!selected) map.setCenter(new maps.LatLng(coordinates.latitude, coordinates.longitude));
    return () => overlay.setMap(null);
  }, [ready, position, selected, hasMe, meNode]);

  function locate(showStatus = true) {
    if (!navigator.geolocation) {
      if (showStatus) setLocationMessage("이 브라우저에서는 위치를 확인할 수 없어요.");
      return;
    }
    if (showStatus) setLocationMessage("내 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude };
        setPosition(next);
        positionCallback.current?.(next);
        setLocationMessage("");
      },
      () => showStatus && setLocationMessage("위치 권한을 허용해 주세요."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <>
      <div ref={element} className="map-canvas" aria-label="카카오 맛집 지도" />
      {error && (
        <div className="map-error" role="alert">
          {error}
        </div>
      )}
      <div className="map-location">
        <button type="button" onClick={() => locate()} aria-label="내 위치로 이동">
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
