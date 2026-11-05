import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import { EmptyState, SectionHead } from "../../components/ui";
import type { Taster } from "../../models/place";
import TasterRows from "./TasterRows";
import { scopeNote } from "./TasterScopeChips";
import {
  PAGE_SIZE,
  filterBrowseTasters,
  type BrowseFilter,
  type ScopeContext,
  type TasterFocusFilter,
  type TasterScope,
  type TasterStats,
} from "./tasterData";

const FOCUS_OPTIONS: { value: TasterFocusFilter; label: string }[] = [
  { value: "ALL", label: "모든 분야" },
  { value: "RESTAURANT", label: "식당" },
  { value: "CAFE_DESSERT", label: "카페·디저트" },
];

/**
 * 맛객 둘러보기: 취향 일치와 상관없이 위쪽 공통 범위 칩(scope)에 드는 맛객 전체를 분야 칩으로 거르고 목록으로 보여 줍니다.
 * 내 주변·내 지역은 그 안에 실제로 기록을 남긴 맛객을 기록이 많은 순, 그 밖은 구독자 많은 순입니다.
 * 분야와 보이는 개수는 TastersScreen이 들고 있어 검색·탭을 오가도 남습니다.
 */
export default function BrowseTasters({
  tasters,
  stats,
  scope,
  filter,
  onFilterChange,
  context,
}: {
  tasters: Taster[];
  stats: Map<string, TasterStats>;
  scope: TasterScope;
  filter: BrowseFilter;
  onFilterChange: (filter: BrowseFilter) => void;
  context: ScopeContext;
}) {
  const app = useAppData();
  const list = filterBrowseTasters(tasters, scope, filter.focus, stats, context);
  const isAreaScope = scope === "NEARBY" || scope === "MY_AREA";

  return (
    <section className="r-tasters-section">
      <SectionHead title="맛객 둘러보기" />
      <div className="r-chips r-tasters-chips r-tasters-chips--small" role="group" aria-label="분야">
        {FOCUS_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.value}
            className={`r-chip ${filter.focus === option.value ? "is-on" : ""}`}
            aria-pressed={filter.focus === option.value}
            onClick={() => onFilterChange({ focus: option.value, limit: PAGE_SIZE })}
          >
            {option.label}
          </button>
        ))}
      </div>
      {list.length ? (
        <>
          <p className="r-tasters-note">
            {scopeNote(scope, context.myArea)} · {isAreaScope ? "그 안 기록이 많은 순" : "구독자 많은 순"}
          </p>
          <TasterRows tasters={list.slice(0, filter.limit)} stats={stats} />
          {list.length > filter.limit && (
            <button
              type="button"
              className="r-button r-button--secondary r-button--pill r-tasters-more"
              onClick={() => onFilterChange({ ...filter, limit: filter.limit + PAGE_SIZE })}
            >
              맛객 더 보기 ({list.length - filter.limit})
            </button>
          )}
        </>
      ) : (
        <EmptyState
          title={scope === "MY_AREA" ? `${context.myArea}에 기록한 맛객이 아직 없어요` : "이 범위의 맛객이 아직 없어요"}
          message={
            isAreaScope
              ? "위쪽에서 전체 지역을 고르거나, 맛객 검색에서 동네 이름으로 찾아보세요."
              : "다른 범위나 분야를 골라 보세요."
          }
        />
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
          <b>지역 묶음 구독</b> · {scope === "MY_AREA" && context.myArea ? `${context.myArea} ` : "한 동네 "}맛객 여럿을
          한 번에 (준비 중)
        </span>
      </button>
    </section>
  );
}
