import { useEffect, useRef, useState } from "react";
import type { MapKind, Place } from "../models/place";
import { loadMapSdk } from "../services/kakao";
import Icon from "./Icon";

type Coordinates = { latitude: number; longitude: number };
type Props = {
  places: Place[];
  subscriptions: string[];
  liked?: string[];
  recommendedTasterIds?: string[];
  onSelect: (place: Place) => void;
  onBoundsChange?: (bounds: MapBounds) => void;
  onPick?: (position: Coordinates) => void;
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
  selected,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<MapInstance | null>(null);
  const pickCallback = useRef(onPick);
  const selectCallback = useRef(onSelect);
  const boundsCallback = useRef(onBoundsChange);
  pickCallback.current = onPick;
  selectCallback.current = onSelect;
  boundsCallback.current = onBoundsChange;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");

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
        maps.event.addListener(map, "idle", () => boundsCallback.current?.(map.getBounds()));
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
    places.forEach((place) => {
      const actualSubscribedTaster = place.tasters.find((taster) => subscriptions.includes(taster.tasterId));
      const sampleSubscription = place.sampleMarkerKind === "subscribed" || place.sampleMarkerKind === "subscribedPhoto";
      const subscribedTaster = actualSubscribedTaster ?? (sampleSubscription ? place.tasters[0] : undefined);
      const matchedTaster = place.tasters.find((taster) => recommendedTasterIds.includes(taster.tasterId));
      const fallbackTaster = place.tasters.find((taster) => taster.tasterId !== "me") ?? {
        tasterId: "sample-taster",
        tasterName: "맛객",
        tag: "",
        avatar: "",
        avatarVariant: 1,
        note: "",
      };
      const sampleKind = place.sampleMarkerKind;
      // 실제 구독·저장 상태를 우선하고, 관계가 없는 샘플은 표식별로 분류해 확인합니다.
      const kind: MapKind = liked.includes(place.id) || place.visibility === "private"
        || place.tasters.some((taster) => taster.tasterId === "me")
        ? "liked"
        : place.advertisement
          ? "ad"
          : actualSubscribedTaster
            ? actualSubscribedTaster.avatar ? "subscribedPhoto" : "subscribed"
            : sampleKind
              ? sampleKind === "own" ? "liked" : sampleKind
              : place.tasters.some((taster) => recommendedTasterIds.includes(taster.tasterId))
                ? "matched"
                : "other";
      const markerRole = kind === "subscribed" || kind === "subscribedPhoto"
        ? "subscribed"
        : kind === "matched" ? "matched" : kind === "other" ? "other" : null;
      const markerTaster = markerRole === "subscribed"
        ? subscribedTaster ?? fallbackTaster
        : markerRole === "matched"
          ? matchedTaster ?? fallbackTaster
          : markerRole === "other"
            ? place.tasters.find((taster) => taster.tasterId !== "me" && !subscriptions.includes(taster.tasterId)) ?? fallbackTaster
            : undefined;
      if (markerRole && markerTaster) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `taster-map-marker taster-map-marker--${markerRole}`;
        button.setAttribute("aria-label", `${markerTaster.tasterName} 맛객이 추천한 ${place.name}`);
        const shell = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        shell.setAttribute("class", "taster-map-marker-shell");
        shell.setAttribute("viewBox", "0 0 43 53");
        shell.setAttribute("aria-hidden", "true");
        const shellPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
        shellPath.setAttribute("d", "M21.5 52S2 32.7 2 19.4a19.5 19.5 0 1 1 39 0C41 32.7 21.5 52 21.5 52Z");
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
          const roleVariant = markerRole === "subscribed" ? 4 : markerRole === "matched" ? 7 : 1;
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
          badge.textContent = markerRole === "subscribed" ? "♥" : "✦";
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
      const glyphs: Record<Exclude<MapKind, "subscribed" | "subscribedPhoto">, string> = {
        other: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.3"/><path d="M5.5 20v-1.5a6.5 6.5 0 0 1 13 0V20"/></svg>',
        matched: '<svg viewBox="0 0 24 24"><circle cx="10" cy="8.5" r="3.2"/><path d="M4.2 20c.2-4 2.2-6.2 5.8-6.2s5.6 2.2 5.8 6.2z"/><path class="map-marker-sparkle" d="m18.5 3 .9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg>',
        liked: '<svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6Z"/></svg>',
        ad: '<svg viewBox="0 0 24 24"><path d="M3 10h18v10H3zM2 10l2-6h16l2 6M6 4v6m4-6v6m4-6v6m4-6v6M9 14h6v6H9z"/></svg>',
      };
      button.innerHTML = `<svg class="map-category-marker-shell" viewBox="0 0 43 53" aria-hidden="true"><path d="M21.5 52S2 32.7 2 19.4a19.5 19.5 0 1 1 39 0C41 32.7 21.5 52 21.5 52Z"/></svg><span class="map-category-marker-glyph" aria-hidden="true">${glyphs[kind as Exclude<MapKind, "subscribed" | "subscribedPhoto">]}</span>`;
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
  }, [places, subscriptions, liked, recommendedTasterIds, ready]);

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

  function locate() {
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저에서는 위치를 확인할 수 없어요.");
      return;
    }
    setLocationMessage("내 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setPosition({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationMessage("");
      },
      () => setLocationMessage("위치 권한을 허용해 주세요."),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
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
        <button onClick={locate}>
          <Icon name="locate" />내 위치
        </button>
        {locationMessage && <small role="status">{locationMessage}</small>}
      </div>
    </>
  );
}
