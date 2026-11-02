import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import { EmptyState, SectionHead } from "../../components/ui";
import type { Taster } from "../../models/place";
import TasterRows from "./TasterRows";
import {
  PAGE_SIZE,
  TRAVEL_REGION,
  filterLocalTasters,
  hasTravelers,
  topRegions,
  type LocalTasterFilter,
  type TasterFocusFilter,
  type TasterStats,
} from "./tasterData";

const FOCUS_OPTIONS: { value: TasterFocusFilter; label: string }[] = [
  { value: "ALL", label: "모든 분야" },
  { value: "RESTAURANT", label: "식당" },
  { value: "CAFE_DESSERT", label: "카페·디저트" },
];

/**
 * 동네 맛객 섹션: 활동 지역·분야 칩으로 거르고 구독자 많은 순으로 보여 줍니다.
 * 고른 조건은 검색·탭을 오가도 남도록 TastersScreen이 들고 있습니다.
 */
export default function LocalTasters({
  tasters,
  stats,
  filter,
  onFilterChange,
}: {
  tasters: Taster[];
  stats: Map<string, TasterStats>;
  filter: LocalTasterFilter;
  onFilterChange: (filter: LocalTasterFilter) => void;
}) {
  const app = useAppData();
  const regions = topRegions(tasters);
  const hasTravel = hasTravelers(tasters);
  const local = filterLocalTasters(tasters, filter, stats);
  const regionChips = [
    { value: "", label: "전체 지역" },
    ...regions.map((name) => ({ value: name, label: name })),
    ...(hasTravel ? [{ value: TRAVEL_REGION, label: "여행·드라이브" }] : []),
  ];

  return (
    <section className="r-tasters-section">
      <SectionHead title="동네 맛객" />
      {(regions.length > 0 || hasTravel) && (
        <div className="r-chips r-tasters-chips" role="group" aria-label="활동 지역">
          {regionChips.map((chip) => (
            <button
              type="button"
              key={chip.value || "all"}
              className={`r-chip ${filter.region === chip.value ? "is-on" : ""}`}
              aria-pressed={filter.region === chip.value}
              onClick={() => onFilterChange({ ...filter, region: chip.value, limit: PAGE_SIZE })}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}
      <div className="r-chips r-tasters-chips r-tasters-chips--small" role="group" aria-label="분야">
        {FOCUS_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`r-chip ${filter.focus === option.value ? "is-on" : ""}`}
            aria-pressed={filter.focus === option.value}
            onClick={() => onFilterChange({ ...filter, focus: option.value, limit: PAGE_SIZE })}
          >
            {option.label}
          </button>
        ))}
      </div>
      {local.length ? (
        <>
          <p className="r-tasters-note">구독자 많은 순</p>
          <TasterRows tasters={local.slice(0, filter.limit)} stats={stats} />
          {local.length > filter.limit && (
            <button
              type="button"
              className="r-button r-button--secondary r-button--pill r-tasters-more"
              onClick={() => onFilterChange({ ...filter, limit: filter.limit + PAGE_SIZE })}
            >
              맛객 더 보기 ({local.length - filter.limit})
            </button>
          )}
        </>
      ) : (
        <EmptyState title="이 조건의 맛객이 아직 없어요" message="다른 지역이나 분야를 골라 보세요." />
      )}
      <button
        type="button"
        className="r-tasters-bundle"
        onClick={() =>
          app.actions.notify({
            kind: "info",
            title: "지역 묶음 구독은 준비 중이에요",
            message: "지금은 맛객을 한 명씩 구독할 수 있어요.",
          })
        }
      >
        <span className="r-tasters-bundle__icon">
          <Icon name="pin" />
        </span>
        <span>
          <b>지역 묶음 구독</b> · {filter.region && filter.region !== TRAVEL_REGION ? `${filter.region} ` : "동네 "}맛객
          여럿을 한 번에 (준비 중)
        </span>
      </button>
    </section>
  );
}
