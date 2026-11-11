import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import MapCanvas from "../../components/MapCanvas";
import type { Place, Taster } from "../../models/place";
import type { Coordinates } from "../../utils/geo";
import {
  ALL_SCOPE_KEY,
  NEARBY_SCOPE_KEY,
  defaultScopeKey,
  nearbyPlaces,
  regionScopes,
  type MapScope,
} from "./tasterMap";

/**
 * 맛객 프로필의 맛집 지도. 동네 위주 맛객은 주 활동 지역, 여행 맛객은 전국 전체부터 보여 주고,
 * 지도 위 칩(내 주변 · 전체 · 시·도별)으로 원하는 범위에 꽉 차게 맞춥니다. 핀은 기록한 곳 전부 그대로 둡니다.
 */
export default function TasterMapCard({ taster, places, isOwn }: { taster: Taster; places: Place[]; isOwn: boolean }) {
  const app = useAppData();
  const regions = regionScopes(places);
  const [selectedKey, setSelectedKey] = useState(() => defaultScopeKey(taster, regions));
  const [position, setPosition] = useState<Coordinates | null>(null);
  const nearby = nearbyPlaces(places, position);

  const scopes: MapScope[] = [
    ...(nearby.length ? [{ key: NEARBY_SCOPE_KEY, label: `내 주변 ${nearby.length}곳`, places: nearby }] : []),
    { key: ALL_SCOPE_KEY, label: `전체 ${places.length}`, places },
    // 한 지역에만 기록했으면 전체와 같으므로 지역 칩은 두지 않습니다.
    ...(regions.length > 1
      ? regions.map((region) => ({ ...region, label: `${region.label} ${region.places.length}` }))
      : []),
  ];
  const selected =
    scopes.find((scope) => scope.key === selectedKey) ?? scopes.find((scope) => scope.key === ALL_SCOPE_KEY);

  return (
    <section className="r-card r-tasters-map-card" aria-label="맛집 지도">
      <div className="r-tasters-map-card__head">
        <b>
          {isOwn ? "내가" : "이 맛객이"} 기록한 맛집 {places.length}곳
        </b>
        <small>칩을 누르면 그 지역에 맞춰 보여 줘요. 핀을 누르면 맛집 상세로 가요.</small>
      </div>
      {scopes.length > 1 && (
        <div className="r-chips r-tasters-map-card__scopes" role="group" aria-label="지도 범위">
          {scopes.map((scope) => (
            <button
              key={scope.key}
              type="button"
              className={`r-chip ${selected?.key === scope.key ? "is-on" : ""}`}
              aria-pressed={selected?.key === scope.key}
              onClick={() => setSelectedKey(scope.key)}
            >
              {scope.key === NEARBY_SCOPE_KEY && <Icon name="locate" />}
              {scope.label}
            </button>
          ))}
        </div>
      )}
      <div className="r-tasters-map">
        <MapCanvas
          places={places}
          fitPlaces={selected?.places}
          subscriptions={app.subscriptionIds}
          onSelect={(place) => go("place", place.id)}
          onPositionChange={setPosition}
          shouldFitToPlaces
        />
      </div>
    </section>
  );
}
