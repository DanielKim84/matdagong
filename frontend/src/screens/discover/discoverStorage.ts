import type { VisitCondition } from "../../models/place";
import { readStorageJson, STORAGE_KEYS, writeStorageJson } from "../../utils/storage";
import {
  DEFAULT_FILTERS,
  FILTER_CONDITIONS,
  SCOPE_OPTIONS,
  type DiscoverFilters,
  type SheetState,
  type SortOrder,
} from "./discoverModel";

/** 발견 화면이 탭 저장소(sessionStorage)에 남기는 화면 상태입니다. 상세 화면을 다녀와도 그대로 이어 봅니다. */
type StoredState = { filters: DiscoverFilters; sheet: SheetState; sort: SortOrder };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFilterCondition(value: unknown): value is VisitCondition {
  return FILTER_CONDITIONS.some((condition) => condition === value);
}

/** 고른 조건과 시트 높이·정렬을 되살립니다. 저장된 값은 알려진 값만 골라 씁니다. */
export function loadStoredState(): StoredState {
  const stored = readStorageJson(STORAGE_KEYS.discoverState, "session");
  if (!isRecord(stored)) return { filters: DEFAULT_FILTERS, sheet: "peek", sort: "priority" };
  const filters = isRecord(stored.filters) ? stored.filters : {};
  return {
    filters: {
      scope: SCOPE_OPTIONS.find((option) => option.value === filters.scope)?.value ?? "all",
      category: typeof filters.category === "string" ? filters.category : "",
      tags: Array.isArray(filters.tags) ? filters.tags.filter((tag): tag is string => typeof tag === "string") : [],
      conditions: Array.isArray(filters.conditions) ? filters.conditions.filter(isFilterCondition) : [],
    },
    sheet: stored.sheet === "half" || stored.sheet === "full" ? stored.sheet : "peek",
    sort: stored.sort === "distance" ? "distance" : "priority",
  };
}

/** 저장소를 쓸 수 없어도 화면은 그대로 동작합니다. */
export function saveStoredState(state: StoredState) {
  writeStorageJson(STORAGE_KEYS.discoverState, state, "session");
}
