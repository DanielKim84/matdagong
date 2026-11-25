import { useEffect, useState } from "react";
import { regionNameAt } from "../services/kakao";
import type { Coordinates } from "../utils/geo";

/**
 * 주어진 좌표(발견은 지금 지도 가운데, 빠른 저장은 지금 위치)의 동네 이름(예: 망원동)을 찾습니다. 좌표가 없거나 찾지 못하면 빈 문자열입니다.
 * 지도를 조금 움직일 때마다 다시 묻지 않도록 소수 셋째 자리(약 100m)로 반올림한 좌표가 바뀔 때만 찾습니다.
 */
export function useRegionName(position: Coordinates | null): string {
  const [region, setRegion] = useState("");
  const round = (value: number | undefined) => (value === undefined ? undefined : Math.round(value * 1000) / 1000);
  const latitude = round(position?.latitude),
    longitude = round(position?.longitude);

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;
    let active = true;
    void regionNameAt({ latitude, longitude }).then((name) => {
      if (active) setRegion(name);
    });
    return () => {
      active = false;
    };
  }, [latitude, longitude]);

  return region;
}
