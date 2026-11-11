import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import { EmptyState, SectionHead } from "../../components/ui";
import type { Taster } from "../../models/place";
import { BrowseNote } from "./TasterFilters";
import TasterRows from "./TasterRows";
import {
  PAGE_SIZE,
  filterBrowseTasters,
  type BrowseFilter,
  type BrowseSort,
  type ScopeContext,
  type TasterFocusFilter,
  type TasterScope,
  type TasterStats,
} from "./tasterData";

const SORT_OPTIONS: { value: BrowseSort; label: string }[] = [
  { value: "SUBSCRIBERS", label: "구독자순" },
  { value: "TASTE", label: "취향순" },
  { value: "RECORDS", label: "기록순" },
];

/**
 * 맛객 둘러보기: 취향 일치와 상관없이 위쪽 공통 조건(지역·분야)에 드는 맛객 전체를 목록으로 보여 줍니다.
 * 제목 오른쪽에서 구독자순 · 취향순 · 기록순을 고릅니다(내 주변·내 지역의 기록순은 그 안에 남긴 기록 수 기준).
 * 정렬과 보이는 개수는 TastersScreen이 들고 있어 검색을 열고 닫아도 남습니다.
 */
export default function BrowseTasters({
  tasters,
  stats,
  scope,
  focus,
  filter,
  onFilterChange,
  context,
}: {
  tasters: Taster[];
  stats: Map<string, TasterStats>;
  scope: TasterScope;
  focus: TasterFocusFilter;
  filter: BrowseFilter;
  onFilterChange: (filter: BrowseFilter) => void;
  context: ScopeContext;
}) {
  const app = useAppData();
  const list = filterBrowseTasters(tasters, scope, focus, filter.sort, stats, context);
  const isAreaScope = scope === "NEARBY" || scope === "MY_AREA";

  return (
    <section className="r-tasters-section">
      <SectionHead title="맛객 둘러보기">
        {/* 세 정렬을 나란히 보여 줘 지금 어떤 순서인지 바로 알 수 있게 합니다(발견 목록 시트와 같은 모양). */}
        <div className="r-tasters-sort" role="group" aria-label="맛객 정렬">
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={filter.sort === option.value ? "is-on" : ""}
              aria-pressed={filter.sort === option.value}
              onClick={() => onFilterChange({ sort: option.value, limit: PAGE_SIZE })}
            >
              {option.label}
            </button>
          ))}
        </div>
      </SectionHead>
      {list.length ? (
        <>
          <BrowseNote scope={scope} focus={focus} sort={filter.sort} myArea={context.myArea} total={list.length} />
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
          title={
            scope === "MY_AREA" ? `${context.myArea}에 기록한 맛객이 아직 없어요` : "이 조건에 맞는 맛객이 아직 없어요"
          }
          message={
            isAreaScope
              ? "위쪽에서 전체 지역이나 모든 분야를 고르거나, 맛객 검색에서 동네 이름으로 찾아보세요."
              : "위쪽에서 다른 지역이나 분야를 골라 보세요."
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
