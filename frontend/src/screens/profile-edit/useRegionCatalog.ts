import { useEffect, useState } from "react";
import { getLegalDongRegions } from "../../services/regions";
import type { RegionData } from "../../models/region";

/** 활동 지역 고르기에 쓸 법정동 목록을 한 번 불러옵니다. */
export function useRegionCatalog() {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [hasCatalogError, setHasCatalogError] = useState(false);

  useEffect(() => {
    let active = true;
    getLegalDongRegions()
      .then((loaded) => {
        if (active) setRegions(loaded);
      })
      .catch(() => {
        if (active) setHasCatalogError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  return { regions, hasCatalogError };
}
