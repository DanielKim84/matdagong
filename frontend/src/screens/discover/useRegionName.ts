import { useEffect, useState } from "react";
import type { Coordinates } from "../../utils/geo";
import { regionNameAt } from "./regionName";

/** 내 위치가 잡히면 그 동네 이름(예: 망원동)을 찾습니다. 위치가 없거나 찾지 못하면 빈 문자열입니다. */
export function useRegionName(device: Coordinates | null): string {
  const [region, setRegion] = useState("");
  const latitude = device?.latitude,
    longitude = device?.longitude;

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
