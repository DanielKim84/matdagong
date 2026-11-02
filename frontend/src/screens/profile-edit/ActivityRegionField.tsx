import type { RegionData } from "../../models/region";
import {
  districtFromLabel,
  districtLabel,
  districtOptions,
  dongOptions,
  type RegionSelection,
} from "./regionSelection";
import RegionPicker from "./RegionPicker";

/** 주 활동 지역을 시·도 → 시·군·구 → 읍·면·동 순서로 고릅니다. 위 단계를 바꾸면 아래 단계는 비웁니다. */
export default function ActivityRegionField({
  regions,
  value,
  hasCatalogError,
  onChange,
}: {
  regions: RegionData[];
  value: RegionSelection;
  hasCatalogError: boolean;
  onChange: (selection: RegionSelection) => void;
}) {
  return (
    <fieldset className="activity-region-field">
      <legend>
        주 활동 지역 <small>선택</small>
      </legend>
      <div className="activity-region-picker">
        <RegionPicker
          label="시·도"
          value={value.sido}
          placeholder="지역 선택"
          options={regions.map((region) => region.name)}
          isDisabled={!regions.length}
          onChange={(sido) => onChange({ sido, district: "", dong: "" })}
        />
        <RegionPicker
          label="시·군·구"
          value={districtLabel(value.district)}
          placeholder="구역 선택"
          options={districtOptions(regions, value.sido)}
          isDisabled={!value.sido}
          onChange={(district) => onChange({ ...value, district: districtFromLabel(district), dong: "" })}
        />
        <RegionPicker
          label="읍·면·동"
          value={value.dong}
          placeholder="동네 선택"
          options={dongOptions(regions, value)}
          isDisabled={!value.district}
          onChange={(dong) => onChange({ ...value, dong })}
        />
      </div>
      <small>
        {hasCatalogError
          ? "지역 목록을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요."
          : "행정안전부 법정동 기준으로 지역을 선택해 주세요."}
      </small>
    </fieldset>
  );
}
