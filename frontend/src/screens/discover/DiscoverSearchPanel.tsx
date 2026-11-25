import type { ReactNode } from "react";
import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import SelectChip from "../../components/SelectChip";
import { detailFilterCount, SCOPE_OPTIONS, type DiscoverFilters, type SortOrder } from "./discoverModel";

/** 검색 결과의 정렬 칩(보드 05-01 "가까운 곳 ▾") 고르기 목록입니다. */
const SEARCH_SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "distance", label: "가까운 곳" },
  { value: "priority", label: "추천순" },
];

// AI 추천은 비용 때문에 기능 플래그로 켤 때만 칩을 보여 줍니다.
const IS_AI_PICK_ENABLED = import.meta.env.VITE_FEATURE_AI_PICK === "true";

/**
 * 발견 위쪽의 검색창 · 큰 제목 · 칩 줄과 불러오기 상태 줄입니다.
 * - 지도(보드 06-01): 맛객 관계 칩(전체 ▾ · 구독 ▾ · 구독 안 한 ▾)과 네모 필터 버튼. 음식 종류·취향 태그·매장 이용은 필터 화면에서 고릅니다.
 * - 검색 중(보드 05-01): "‘검색어’ 검색 결과 N곳", 회색 안내, 정렬 칩(가까운 곳 ▾) · 맛객 관계 칩(전체 ▾) · 오른쪽 "지도 보기".
 */
export default function DiscoverSearchPanel({
  region,
  filters,
  resultCount,
  sort,
  canSortByDistance,
  onSortChange,
  isMapView,
  onMapViewChange,
  onFiltersChange,
  onFilterOpen,
  notice,
}: {
  /** 지금 지도 가운데 동네 이름(모르면 빈 문자열). 제목에 씁니다. */
  region: string;
  filters: DiscoverFilters;
  resultCount: number;
  sort: SortOrder;
  canSortByDistance: boolean;
  onSortChange: (sort: SortOrder) => void;
  /** 검색 결과를 지도로 보는 중인지(검색 중에만 씀) */
  isMapView: boolean;
  onMapViewChange: (isMapView: boolean) => void;
  onFiltersChange: (filters: DiscoverFilters) => void;
  onFilterOpen: () => void;
  /** 검색창 아래 큰 제목 대신 둘 안내(위치 권한 없음, 보드 18-01). 있으면 제목은 "지도로 맛집 둘러보기"로 줄입니다. */
  notice?: ReactNode;
}) {
  const app = useAppData();
  const detailCount = detailFilterCount(filters);
  const query = app.query.trim();

  function chooseSort(next: SortOrder) {
    if (next === "distance" && !canSortByDistance) {
      app.actions.notify({
        kind: "info",
        title: "내 위치가 필요해요",
        message: "위치 권한을 켜면 가까운 곳부터 볼 수 있어요.",
      });
      return;
    }
    onSortChange(next);
  }

  function openAiPick() {
    app.actions.notify({
      kind: "info",
      title: "AI 추천은 준비 중이에요",
      message: "맛객 기록을 근거로 골라 주는 추천을 준비하고 있어요.",
    });
  }

  return (
    <div className="r-discover__top">
      <label className="r-search-field">
        <Icon name="search" />
        <span className="visually-hidden">맛집 검색</span>
        <input
          type="search"
          value={app.query}
          onChange={(event) => app.setQuery(event.target.value)}
          placeholder="지금, 어떤 맛집을 찾고 있나요?"
          enterKeyHint="search"
        />
        {app.query && (
          <button
            type="button"
            className="r-search-field__clear"
            aria-label="검색어 지우기"
            onClick={() => app.setQuery("")}
          >
            <Icon name="close" />
          </button>
        )}
      </label>

      {notice && !query ? (
        <>
          {notice}
          <h2 className="r-home-title r-home-title--sub">지도로 맛집 둘러보기</h2>
        </>
      ) : query ? (
        <>
          <h2 className="r-home-title">
            ‘{query}’ 검색 결과 {app.isLoading ? "" : `${resultCount}곳`}
          </h2>
          {/* 발견 검색은 맛객 기록이 있는 곳만 찾습니다. 카카오 전체 장소 검색은 내 지도에서 합니다(보드 05-01). */}
          <p className="r-info-note">
            <Icon name="info" />
            발견 검색에는 맛객 기록이 있는 곳만 표시돼요.
          </p>
        </>
      ) : (
        <h2 className="r-home-title">
          {region ? `${region}의` : "이 지역의"} 추천 기록을
          <br />
          지도에서 탐색해요.
        </h2>
      )}

      {query ? (
        <div className="r-discover-chips" role="toolbar" aria-label="검색 결과 보기">
          <SelectChip label="정렬" value={sort} options={SEARCH_SORT_OPTIONS} onChange={chooseSort} />
          <SelectChip
            label="맛객 관계"
            value={filters.scope}
            options={SCOPE_OPTIONS}
            onChange={(scope) => onFiltersChange({ ...filters, scope })}
          />
          <button
            type="button"
            className="r-discover-chips__map"
            aria-pressed={isMapView}
            onClick={() => onMapViewChange(!isMapView)}
          >
            <Icon name={isMapView ? "list" : "map"} />
            {isMapView ? "목록 보기" : "지도 보기"}
          </button>
        </div>
      ) : (
        <div className="r-discover-chips" role="toolbar" aria-label="지도 필터">
          <div className="r-chips">
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`r-chip ${filters.scope === option.value ? "is-on" : ""}`}
                aria-pressed={filters.scope === option.value}
                onClick={() => onFiltersChange({ ...filters, scope: option.value })}
              >
                {option.label}
                <Icon name="chevron-down" />
              </button>
            ))}
            {IS_AI_PICK_ENABLED && (
              <button type="button" className="r-chip r-chip--accent" onClick={openAiPick}>
                <Icon name="sparkle" />
                AI 추천
              </button>
            )}
          </div>
          <button
            type="button"
            className={`r-discover-chips__filter ${detailCount ? "is-on" : ""}`}
            onClick={onFilterOpen}
            aria-label={detailCount ? `필터, ${detailCount}개 적용 중` : "필터"}
          >
            <Icon name="filter" />
            {detailCount > 0 && <i>{detailCount}</i>}
          </button>
        </div>
      )}

      {app.error && app.places.length > 0 ? (
        <p className="r-discover-status" role="alert">
          새 목록을 불러오지 못했어요
          <button type="button" onClick={app.actions.retry}>
            다시 불러오기
          </button>
        </p>
      ) : (
        app.isLoading && (
          <p className="r-discover-status" role="status">
            주변 맛집을 불러오고 있어요…
          </p>
        )
      )}
    </div>
  );
}
