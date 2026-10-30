import { useEffect, useRef, useState } from "react";
import type { MapKind, Place } from "../models/place";
import { loadMapSdk } from "../services/kakao";
import Icon from "./Icon";
import { MARKER_SHELL_PATH, categoryMarkerHtml, type CategoryMarkerKind } from "./mapMarkerArt";
import type { Coordinates } from "../utils/geo";
type Props = {
  places: Place[];
  subscriptions: string[];
  liked?: string[];
  recommendedTasterIds?: string[];
  onSelect: (place: Place) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  onPick?: (position: Coordinates) => void;
  onPositionChange?: (position: Coordinates) => void;
  selected?: Coordinates | null;
};

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
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  const [zoomLevel, setZoomLevel] = useState(5);

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
          boundsCallback.current?.(map.getBounds());
          setZoomLevel(map.getLevel());
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
      .catch((reason: Error) => {
        if (active) setError(reason.message);
      });
    return () => {
      active = false;
      instance.current = null;
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
    // 가까이 볼 때는 개별 핀, 축소하면 격자 단위 묶음(광고 제외), 가장 넓게 볼 때는 마커를 숨깁니다.
    if (zoomLevel >= 10) return;
    if (zoomLevel >= 7) {
      const cellSize = 0.018 * 2 ** (zoomLevel - 7);
      const groups = new Map<string, { latitude: number; longitude: number; count: number }>();
      places.filter((place) => !place.advertisement).forEach((place) => {
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
        button.setAttribute("aria-label", `광고를 제외한 맛집 ${group.count}곳`);
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
      const fallbackTaster = place.tasters.find((taster) => taster.tasterId !== "me") ?? {
        tasterId: "sample-taster",
        tasterName: "맛객",
        tag: "",
        avatar: "",
        avatarVariant: 1,
        note: "",
      };
      // 내 기록, 좋아요, 구독, 취향 일치 관계를 계정 데이터로 판단해 마커를 정확히 나눕니다.
      const isMyRecord = place.visibility === "private"
        || place.tasters.some((taster) => taster.tasterId === "me");
      const kind: MapKind = isMyRecord
        ? "own"
        : liked.includes(place.id)
          ? "liked"
          : place.advertisement
          ? "ad"
          : subscribedTaster
            ? subscribedTaster.avatar ? "subscribedPhoto" : "subscribed"
          : place.tasters.some((taster) => recommendedTasterIds.includes(taster.tasterId))
            ? "matched"
            : "other";
      const markerRole = kind === "subscribed" || kind === "subscribedPhoto"
        ? "subscribed"
        : kind === "matched" ? "matched" : kind === "other" ? "other" : kind === "own" ? "own" : null;
      const markerTaster = markerRole === "subscribed"
        ? subscribedTaster ?? fallbackTaster
        : markerRole === "matched"
          ? matchedTaster ?? fallbackTaster
          : markerRole === "other"
            ? place.tasters.find((taster) => taster.tasterId !== "me" && !subscriptions.includes(taster.tasterId)) ?? fallbackTaster
            : markerRole === "own"
              ? place.tasters.find((taster) => taster.tasterId === "me") ?? fallbackTaster
            : undefined;
      if (markerRole && markerTaster) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `taster-map-marker taster-map-marker--${markerRole}`;
        button.setAttribute("aria-label", `${markerRole === "own" ? "내가 등록한" : markerRole === "other" ? `구독하지 않은 ${markerTaster.tasterName} 맛객이 추천한` : `${markerTaster.tasterName} 맛객이 추천한`} ${place.name}`);
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
          const roleVariant = markerRole === "subscribed" ? 4 : markerRole === "matched" ? 7 : markerRole === "own" ? markerTaster.avatarVariant : 1;
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
          badge.textContent = markerRole === "subscribed" ? "♥" : markerRole === "own" ? "✓" : "✦";
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
        return;
      }
      // 내 맛집과 광고 장소는 맛객 얼굴 대신 각 상태를 나타내는 기호로 표시합니다.
      const button = document.createElement("button");
      button.type = "button";
      button.className = `map-category-marker map-category-marker--${kind}`;
      button.setAttribute("aria-label", `${kind} · ${place.name}`);
      button.innerHTML = categoryMarkerHtml(kind as CategoryMarkerKind);
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
    });
    return () => {
      overlays.forEach((overlay) => overlay.setMap(null));
    };
  }, [places, subscriptions, liked, recommendedTasterIds, ready, zoomLevel]);

  useEffect(() => {
    const map = instance.current,
      maps = window.kakao?.maps;
    const coordinates = selected ?? position;
    if (!ready || !map || !maps || !coordinates) return;
    const overlay = new maps.CustomOverlay({
      map,
      position: new maps.LatLng(coordinates.latitude, coordinates.longitude),
      content: '<span class="position-dot"></span>',
      yAnchor: 0.5,
    });
    if (!selected)
      map.setCenter(
        new maps.LatLng(coordinates.latitude, coordinates.longitude),
      );
    return () => overlay.setMap(null);
  }, [ready, position, selected]);

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
        <button onClick={() => locate()}>
          <Icon name="locate" />내 위치
        </button>
        {locationMessage && <small role="status">{locationMessage}</small>}
      </div>
    </>
  );
}
