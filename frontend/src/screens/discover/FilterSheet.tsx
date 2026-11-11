import { useState, type ReactNode } from "react";
import GroupIcon, { tagGroupLook, type GroupLook } from "../../components/GroupIcon";
import { HashMark } from "../../components/HashTag";
import Icon from "../../components/Icon";
import Sheet from "../../components/Sheet";
import { TASTE_TAG_GROUP_LABELS, type TasteTagGroup } from "../../models/tasteTags";
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
  look,
  title,
  count = 0,
  children,
}: {
  look: GroupLook;
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <fieldset className="r-discover-filter__group">
      <legend className="r-discover-filter__legend">
        <GroupIcon look={look} />
        {title}
        {count > 0 && <em className="r-discover-filter__count">{count}개 선택</em>}
      </legend>
      {children}
    </fieldset>
  );
}

/** 고르는 태그 칩 하나. 태그처럼 앞에 코랄 #을 붙입니다. */
function FilterChip({ label, isOn, onToggle }: { label: string; isOn: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`r-chip ${isOn ? "is-on" : ""}`} aria-pressed={isOn} onClick={onToggle}>
      <HashMark />
      {label}
    </button>
  );
}

/**
 * 발견 지도의 상세 필터입니다. 고르는 동안 결과 수를 바로 보여 주고 "N곳 보기"로 적용합니다.
 * '내 위치에서 보기' 반경은 맛집을 거르지 않고, 적용할 때 지도 범위만 그 반경에 맞춥니다.
 * 모든 칩을 접지 않고 다 보여 줍니다. 필터는 보통 한두 개만 빨리 고르므로, 시트 위에 또 팝업을 띄우는 대신 훑어 내려 고릅니다.
 */
export default function FilterSheet({
  initial,
  categories,
  tagSections,
  hasPosition,
  countMatches,
  onApply,
  onClose,
}: {
  initial: DiscoverFilters;
  categories: string[];
  /** 취향 태그 묶음(여행·드라이브·뷰·분위기·이럴 때). 태그는 이 근처에서 많이 쓰인 순입니다. */
  tagSections: { group: TasteTagGroup; tags: string[] }[];
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
  const count = countMatches(draft);

  function reset() {
    setDraft(DEFAULT_FILTERS);
    setRadius(null);
  }

  return (
    <Sheet title="필터" onClose={onClose} className="r-discover-filter">
      <div className="r-discover-filter__groups">
        <FilterGroup look={{ icon: "user", tone: "brand" }} title="누구의 기록">
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

        <FilterGroup look={{ icon: "locate", tone: "blue" }} title="내 위치에서 보기">
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
          <FilterGroup look={tagGroupLook("CUISINE")} title="음식 종류" count={draft.category ? 1 : 0}>
            <div className="r-chips r-chips--wrap">
              {categoryOptions.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  isOn={draft.category === category}
                  onToggle={() => setDraft({ ...draft, category: draft.category === category ? "" : category })}
                />
              ))}
            </div>
          </FilterGroup>
        )}

        {tagSections.map((section) => (
          <FilterGroup
            key={section.group}
            look={tagGroupLook(section.group)}
            title={TASTE_TAG_GROUP_LABELS[section.group]}
            count={draft.tags.filter((tag) => section.tags.includes(tag)).length}
          >
            <div className="r-chips r-chips--wrap" role="group" aria-label={TASTE_TAG_GROUP_LABELS[section.group]}>
              {section.tags.map((tag) => (
                <FilterChip
                  key={tag}
                  label={tag}
                  isOn={draft.tags.includes(tag)}
                  onToggle={() => setDraft({ ...draft, tags: toggleItem(draft.tags, tag) })}
                />
              ))}
            </div>
          </FilterGroup>
        ))}

        <FilterGroup look={tagGroupLook("VISIT")} title="매장 정보" count={draft.conditions.length}>
          <div className="r-chips r-chips--wrap" role="group" aria-label="매장 정보">
            {FILTER_CONDITIONS.map((condition) => (
              <FilterChip
                key={condition}
                label={condition}
                isOn={draft.conditions.includes(condition)}
                onToggle={() => setDraft({ ...draft, conditions: toggleItem(draft.conditions, condition) })}
              />
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
