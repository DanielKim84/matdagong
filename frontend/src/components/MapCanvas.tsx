import { useEffect, useRef, useState } from "react";
import type { MapKind, Place } from "../models/place";
import { loadMapSdk } from "../services/kakao";
import Icon from "./Icon";

type Coordinates = { latitude: number; longitude: number };
type Props = {
  places: Place[];
  subscriptions: string[];
  onSelect: (place: Place) => void;
  onPick?: (position: Coordinates) => void;
  selected?: Coordinates | null;
};

export default function MapCanvas({
  places,
  subscriptions,
  onSelect,
  onPick,
  selected,
}: Props) {
  const element = useRef<HTMLDivElement>(null);
  const instance = useRef<MapInstance | null>(null);
  const pickCallback = useRef(onPick);
  const selectCallback = useRef(onSelect);
  pickCallback.current = onPick;
  selectCallback.current = onSelect;
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
    const markers = places.map((place) => {
      const kind: MapKind = place.tasters.some((taster) =>
        subscriptions.includes(taster.tasterId),
      )
        ? "subscribed"
        : "other";
      const marker = new maps.Marker({
        map,
        position: new maps.LatLng(place.latitude, place.longitude),
        clickable: true,
        title: place.name,
        image: new maps.MarkerImage(
          `/assets/pin-${kind}.svg`,
          new maps.Size(43, 53),
          { offset: new maps.Point(21, 51) },
        ),
      });
      maps.event.addListener(marker, "click", () =>
        selectCallback.current(place),
      );
      return marker;
    });
    return () => markers.forEach((marker) => marker.setMap(null));
  }, [places, subscriptions, ready]);

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
