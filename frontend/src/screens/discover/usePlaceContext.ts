import { useMemo } from "react";
import { useAppData } from "../../app/AppData";
import type { Taster } from "../../models/place";
import type { Coordinates } from "../../utils/geo";
import type { PlaceContext } from "./discoverModel";

/**
 * 발견·내 지도의 카드·목록이 장소를 판단할 때 쓰는 계정 관계(구독, 내 위치, 맛객 취향 %)입니다.
 * 지도 마커는 장소 배열이 바뀔 때마다 다시 그려지므로, 카드 선택·지도 이동만으로는 새 값을 만들지 않습니다.
 */
export function usePlaceContext(device: Coordinates | null): PlaceContext {
  const { subscriptionIds, tasterById } = useAppData();
  return useMemo(
    () => ({
      subscriptions: new Set(subscriptionIds),
      device,
      matchOf: (taster: Taster) => taster.matchScore ?? tasterById.get(taster.tasterId)?.matchScore ?? 0,
    }),
    [subscriptionIds, tasterById, device],
  );
}
