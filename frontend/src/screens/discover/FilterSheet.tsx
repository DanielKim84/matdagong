import { useState } from "react";
import type { VisitCondition } from "../../models/place";
import Sheet from "../../components/Sheet";
import { Segmented } from "../../components/ui";
import {
  DEFAULT_FILTERS,
  DISTANCE_OPTIONS,
  FILTER_CONDITIONS,
  SCOPE_OPTIONS,
  type DiscoverFilters,
  type DistanceLimit,
} from "./discoverModel";

/** 발견 지도의 상세 필터입니다. 고르는 동안 결과 수를 바로 보여 주고 "N곳 보기"로 적용합니다. */
export default function FilterSheet({
  initial,
  categories,
  tags,
  hasPosition,
  countFor,
  onApply,
  onClose,
}: {
  initial: DiscoverFilters;
  categories: string[];
  tags: string[];
  hasPosition: boolean;
  countFor: (filters: DiscoverFilters) => number;
  onApply: (filters: DiscoverFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const toggle = <T,>(list: T[], value: T) => list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
  // 지금 고른 값이 목록에 없어도(다른 검색어로 바뀐 경우) 해제할 수 있게 함께 보여 줍니다.
  const categoryOptions = draft.category && !categories.includes(draft.category) ? [draft.category, ...categories] : categories;
  const tagOptions = [...draft.tags.filter((tag) => !tags.includes(tag)), ...tags];
  const count = countFor(draft);

  return (
    <Sheet title="필터" onClose={onClose} className="r-discover-filter">
      <div className="r-discover-filter__groups">
        <fieldset className="r-discover-filter__group">
          <legend>누구의 기록</legend>
          <div className="r-chips r-chips--wrap">
            {SCOPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`r-chip ${draft.scope === option.value ? "is-on" : ""}`}
                aria-pressed={draft.scope === option.value}
                onClick={() => setDraft({ ...draft, scope: option.value })}
              >
                {option.sheetLabel}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="r-discover-filter__group">
          <legend>거리</legend>
          {hasPosition ? (
            <Segmented<`${DistanceLimit}`>
              label="거리"
              value={`${draft.distance}`}
              options={DISTANCE_OPTIONS.map((option) => ({ value: `${option.value}`, label: option.label }))}
              onChange={(value) => setDraft({ ...draft, distance: Number(value) as DistanceLimit })}
            />
          ) : (
            <p className="r-discover-filter__note">지도에서 내 위치를 켜면 거리로 고를 수 있어요.</p>
          )}
        </fieldset>

        {categoryOptions.length > 0 && (
          <fieldset className="r-discover-filter__group">
            <legend>음식 종류</legend>
            <div className="r-chips r-chips--wrap">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`r-chip ${draft.category === category ? "is-on" : ""}`}
                  aria-pressed={draft.category === category}
                  onClick={() => setDraft({ ...draft, category: draft.category === category ? "" : category })}
                >
                  {category}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {tagOptions.length > 0 && (
          <fieldset className="r-discover-filter__group">
            <legend>이럴 때</legend>
            <div className="r-chips r-chips--wrap">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`r-chip ${draft.tags.includes(tag) ? "is-on" : ""}`}
                  aria-pressed={draft.tags.includes(tag)}
                  onClick={() => setDraft({ ...draft, tags: toggle(draft.tags, tag) })}
                >
                  {tag}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="r-discover-filter__group">
          <legend>매장 정보</legend>
          <div className="r-chips r-chips--wrap">
            {FILTER_CONDITIONS.map((condition: VisitCondition) => (
              <button
                key={condition}
                type="button"
                className={`r-chip ${draft.conditions.includes(condition) ? "is-on" : ""}`}
                aria-pressed={draft.conditions.includes(condition)}
                onClick={() => setDraft({ ...draft, conditions: toggle(draft.conditions, condition) })}
              >
                {condition}
              </button>
            ))}
          </div>
          <p className="r-discover-filter__note">맛객이 직접 다녀와 남긴 매장 정보로 골라요.</p>
        </fieldset>
      </div>

      <div className="r-discover-filter__actions">
        <button type="button" className="r-button r-button--secondary" onClick={() => setDraft(DEFAULT_FILTERS)}>
          초기화
        </button>
        <button type="button" className="r-button r-button--primary" onClick={() => onApply(draft)} disabled={count === 0}>
          {count ? `${count}곳 보기` : "맞는 곳이 없어요"}
        </button>
      </div>
    </Sheet>
  );
}
