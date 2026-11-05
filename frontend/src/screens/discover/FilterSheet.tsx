import { useState, type ReactNode } from "react";
import { HashMark } from "../../components/HashTag";
import Icon, { type IconName } from "../../components/Icon";
import Sheet from "../../components/Sheet";
import {
  DEFAULT_FILTERS,
  FILTER_CONDITIONS,
  SCOPE_OPTIONS,
  VIEW_RADIUS_OPTIONS,
  type DiscoverFilters,
  type ViewRadius,
} from "./discoverModel";

function toggleItem<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** 조건 묶음 하나: 색 동그라미 아이콘 + 제목(+고른 수) + 내용. 묶음마다 흰 카드로 나눠 한눈에 보이게 합니다. */
function FilterGroup({
  icon,
  tone,
  title,
  count = 0,
  children,
}: {
  icon: IconName;
  tone: "brand" | "blue" | "amber" | "green" | "berry";
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <fieldset className="r-discover-filter__group">
      <legend className="r-discover-filter__legend">
        <span className={`r-discover-filter__icon r-discover-filter__icon--${tone}`} aria-hidden="true">
          <Icon name={icon} />
        </span>
        {title}
        {count > 0 && <em className="r-discover-filter__count">{count}개 선택</em>}
      </legend>
      {children}
    </fieldset>
  );
}

/**
 * 발견 지도의 상세 필터입니다. 고르는 동안 결과 수를 바로 보여 주고 "N곳 보기"로 적용합니다.
 * '내 위치에서 보기' 반경은 맛집을 거르지 않고, 적용할 때 지도 범위만 그 반경에 맞춥니다.
 */
export default function FilterSheet({
  initial,
  categories,
  tags,
  hasPosition,
  countMatches,
  onApply,
  onClose,
}: {
  initial: DiscoverFilters;
  categories: string[];
  tags: string[];
  hasPosition: boolean;
  countMatches: (filters: DiscoverFilters) => number;
  onApply: (filters: DiscoverFilters, radius: ViewRadius | null) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [radius, setRadius] = useState<ViewRadius | null>(null);
  // 지금 고른 값이 목록에 없어도(다른 검색어로 바뀐 경우) 해제할 수 있게 함께 보여 줍니다.
  const categoryOptions =
    draft.category && !categories.includes(draft.category) ? [draft.category, ...categories] : categories;
  const tagOptions = [...draft.tags.filter((tag) => !tags.includes(tag)), ...tags];
  const count = countMatches(draft);

  function reset() {
    setDraft(DEFAULT_FILTERS);
    setRadius(null);
  }

  return (
    <Sheet title="필터" onClose={onClose} className="r-discover-filter">
      <div className="r-discover-filter__groups">
        <FilterGroup icon="user" tone="brand" title="누구의 기록">
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
        </FilterGroup>

        <FilterGroup icon="locate" tone="blue" title="내 위치에서 보기">
          {hasPosition ? (
            <>
              <div className="r-discover-filter__radius" role="group" aria-label="지도에 보여 줄 반경">
                {VIEW_RADIUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`r-discover-filter__radius-option ${radius === option.value ? "is-on" : ""}`}
                    aria-pressed={radius === option.value}
                    onClick={() => setRadius(radius === option.value ? null : option.value)}
                  >
                    <b>{option.label}</b>
                    <small>{option.hint}</small>
                  </button>
                ))}
              </div>
              <p className="r-discover-filter__note">
                고른 반경이 꼭 차게 지도를 맞춰요. 맛집을 거르지는 않고, 그다음엔 지도를 마음대로 움직여도 돼요.
              </p>
            </>
          ) : (
            <p className="r-discover-filter__note">지도에서 ‘내 위치’를 켜면 반경으로 지도를 맞출 수 있어요.</p>
          )}
        </FilterGroup>

        {categoryOptions.length > 0 && (
          <FilterGroup icon="fork" tone="amber" title="음식 종류" count={draft.category ? 1 : 0}>
            <div className="r-chips r-chips--wrap">
              {categoryOptions.map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`r-chip ${draft.category === category ? "is-on" : ""}`}
                  aria-pressed={draft.category === category}
                  onClick={() => setDraft({ ...draft, category: draft.category === category ? "" : category })}
                >
                  <HashMark />
                  {category}
                </button>
              ))}
            </div>
          </FilterGroup>
        )}

        {tagOptions.length > 0 && (
          <FilterGroup icon="sparkle" tone="green" title="이럴 때" count={draft.tags.length}>
            <div className="r-chips r-chips--wrap">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`r-chip ${draft.tags.includes(tag) ? "is-on" : ""}`}
                  aria-pressed={draft.tags.includes(tag)}
                  onClick={() => setDraft({ ...draft, tags: toggleItem(draft.tags, tag) })}
                >
                  <HashMark />
                  {tag}
                </button>
              ))}
            </div>
          </FilterGroup>
        )}

        <FilterGroup icon="check" tone="berry" title="매장 정보" count={draft.conditions.length}>
          <div className="r-chips r-chips--wrap">
            {FILTER_CONDITIONS.map((condition) => (
              <button
                key={condition}
                type="button"
                className={`r-chip ${draft.conditions.includes(condition) ? "is-on" : ""}`}
                aria-pressed={draft.conditions.includes(condition)}
                onClick={() => setDraft({ ...draft, conditions: toggleItem(draft.conditions, condition) })}
              >
                <HashMark />
                {condition}
              </button>
            ))}
          </div>
          <p className="r-discover-filter__note">맛객이 직접 다녀와 남긴 매장 정보로 골라요.</p>
        </FilterGroup>
      </div>

      <div className="r-discover-filter__actions">
        <button type="button" className="r-button r-button--secondary" onClick={reset}>
          <Icon name="close" />
          초기화
        </button>
        <button
          type="button"
          className="r-button r-button--primary"
          onClick={() => onApply(draft, radius)}
          disabled={count === 0}
        >
          {count ? `${count}곳 보기` : "맞는 곳이 없어요"}
        </button>
      </div>
    </Sheet>
  );
}
