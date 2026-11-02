import type { Ref } from "react";
import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import { NotificationButton } from "../../components/ui";
import type { Coordinates } from "../../utils/geo";
import { detailFilterCount, SCOPE_OPTIONS, type DiscoverFilters } from "./discoverModel";
import { useRegionName } from "./useRegionName";

// AI 추천은 비용 때문에 기능 플래그로 켤 때만 칩을 보여 줍니다.
const IS_AI_PICK_ENABLED = import.meta.env.VITE_FEATURE_AI_PICK === "true";
const QUICK_CATEGORY_LIMIT = 5;

/** 지도 위에 떠 있는 검색창·알림 버튼·필터 칩과 불러오기 상태 줄입니다. */
export default function DiscoverSearchPanel({
  ref,
  device,
  filters,
  categories,
  resultCount,
  onFiltersChange,
  onFilterOpen,
}: {
  /** 시트 펼침 높이를 계산할 때 이 영역의 아래 끝을 잽니다. */
  ref: Ref<HTMLDivElement>;
  device: Coordinates | null;
  filters: DiscoverFilters;
  /** 많이 쓰인 음식 종류(앞의 몇 개를 바로 고르는 칩으로 보여 줌) */
  categories: string[];
  resultCount: number;
  onFiltersChange: (filters: DiscoverFilters) => void;
  onFilterOpen: () => void;
}) {
  const app = useAppData();
  const region = useRegionName(device);
  const detailCount = detailFilterCount(filters);
  const quickCategories = categories.slice(0, QUICK_CATEGORY_LIMIT);
  if (filters.category && !quickCategories.includes(filters.category)) quickCategories.unshift(filters.category);

  function openAiPick() {
    app.actions.notify({
      kind: "info",
      title: "AI 추천은 준비 중이에요",
      message: "맛객 기록을 근거로 골라 주는 추천을 준비하고 있어요.",
    });
  }

  return (
    <div className="r-discover__top" ref={ref}>
      <div className="r-discover__search-row">
        <label className="r-discover-search">
          <Icon name="search" />
          <span className="visually-hidden">맛집 검색</span>
          <input
            type="search"
            value={app.query}
            onChange={(event) => app.setQuery(event.target.value)}
            placeholder={`${region ? `${region} · ` : ""}맛집, 음식 종류, 동네`}
            enterKeyHint="search"
          />
          {app.query && (
            <button
              type="button"
              className="r-discover-search__clear"
              aria-label="검색어 지우기"
              onClick={() => app.setQuery("")}
            >
              <Icon name="close" />
            </button>
          )}
        </label>
        <NotificationButton isFloating />
      </div>

      <div className="r-chips r-discover-chips" role="toolbar" aria-label="지도 필터">
        <button
          type="button"
          className={`r-chip r-discover-chips__filter ${detailCount ? "is-on" : ""}`}
          onClick={onFilterOpen}
          aria-label={detailCount ? `필터, ${detailCount}개 적용 중` : "필터"}
        >
          <Icon name="filter" />
          필터{detailCount > 0 && <i>{detailCount}</i>}
        </button>
        {SCOPE_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`r-chip ${filters.scope === option.value ? "is-on" : ""}`}
            aria-pressed={filters.scope === option.value}
            onClick={() => onFiltersChange({ ...filters, scope: option.value })}
          >
            {option.label}
          </button>
        ))}
        {IS_AI_PICK_ENABLED && (
          <button type="button" className="r-chip r-chip--accent" onClick={openAiPick}>
            <Icon name="sparkle" />
            AI 추천
          </button>
        )}
        {quickCategories.length > 0 && <span className="r-discover-chips__divider" aria-hidden="true" />}
        {quickCategories.map((category) => (
          <button
            key={category}
            type="button"
            className={`r-chip ${filters.category === category ? "is-on" : ""}`}
            aria-pressed={filters.category === category}
            onClick={() => onFiltersChange({ ...filters, category: filters.category === category ? "" : category })}
          >
            {category}
          </button>
        ))}
      </div>

      {app.error && app.places.length > 0 ? (
        <p className="r-discover-status" role="alert">
          새 목록을 불러오지 못했어요
          <button type="button" onClick={app.actions.retry}>
            다시 불러오기
          </button>
        </p>
      ) : (
        (app.loading || app.query) && (
          <p className="r-discover-status" role="status">
            {app.loading ? "주변 맛집을 불러오고 있어요…" : `‘${app.query}’ 검색 결과 ${resultCount}곳`}
          </p>
        )
      )}
    </div>
  );
}
