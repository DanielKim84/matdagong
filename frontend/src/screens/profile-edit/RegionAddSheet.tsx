import { useState } from "react";
import Sheet from "../../components/Sheet";
import type { RegionData } from "../../models/region";
import ActivityRegionField from "./ActivityRegionField";
import { EMPTY_REGION_SELECTION, joinRegionSelection } from "./regionSelection";

/**
 * 활동 지역 한 곳 더하기(보드 15-01 "활동 지역 · 최대 3곳"). 시·도만 골라도 되고(예: 서울), 시·군·구·읍·면·동까지 좁혀도 됩니다.
 * 이미 넣은 곳과 같으면 더하지 않습니다(useProfileForm.addActivityRegion).
 */
export default function RegionAddSheet({
  regions,
  hasCatalogError,
  onAdd,
  onClose,
}: {
  regions: RegionData[];
  hasCatalogError: boolean;
  onAdd: (region: string) => void;
  onClose: () => void;
}) {
  const [selection, setSelection] = useState(EMPTY_REGION_SELECTION);
  const region = joinRegionSelection(selection);

  return (
    <Sheet title="활동 지역 추가" onClose={onClose} className="region-add-sheet">
      <p className="region-add-sheet__lead">시·도만 골라도 되고, 동네까지 좁혀도 돼요.</p>
      <ActivityRegionField
        regions={regions}
        value={selection}
        hasCatalogError={hasCatalogError}
        onChange={setSelection}
      />
      <button
        type="button"
        className="r-button r-button--primary r-button--block"
        disabled={!selection.sido}
        onClick={() => {
          onAdd(region);
          onClose();
        }}
      >
        {selection.sido ? `${region} 추가` : "지역을 골라 주세요"}
      </button>
    </Sheet>
  );
}
