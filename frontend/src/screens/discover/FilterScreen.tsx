import { useState, type ReactNode } from "react";
import Icon from "../../components/Icon";
import SubScreen from "../../components/SubScreen";
import { TASTE_TAG_GROUP_LABELS, type TasteTagGroup } from "../../models/tasteTags";
import { DEFAULT_FILTERS, FILTER_CONDITIONS, SCOPE_OPTIONS, type DiscoverFilters } from "./discoverModel";

function toggleItem<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

/** 조건 묶음 하나: 굵은 제목과 그 아래 칩(보드 05-03). */
function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="r-discover-filter__group">
      <legend className="r-discover-filter__legend">{title}</legend>
      {children}
    </fieldset>
  );
}

function FilterChip({ label, isOn, onToggle }: { label: string; isOn: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`r-chip ${isOn ? "is-on" : ""}`} aria-pressed={isOn} onClick={onToggle}>
      {label}
    </button>
  );
}

/**
 * 발견 지도의 필터(보드 05-03, 전체 화면): 위 오른쪽 "초기화", 맛객 관계(전체 · 구독 · 구독 안 함)와 "선택한 조건이 모두 맞는 곳" 안내,
 * 음식 종류 · 취향 태그 묶음(여행·드라이브 · 뷰·분위기 · 이럴 때) · 매장 이용 칩, 아래 "적용하기"입니다.
 * 고르는 동안은 이 화면 안에서만 바꾸고, 적용하기를 눌러야 지도와 목록에 반영합니다.
 */
export default function FilterScreen({
  initial,
  cuisineOptions,
  tagSections,
  onApply,
  onClose,
}: {
  initial: DiscoverFilters;
  cuisineOptions: string[];
  /** 취향 태그 묶음(여행·드라이브·뷰·분위기·이럴 때). 태그는 이 근처에서 많이 쓰인 순입니다. */
  tagSections: { group: TasteTagGroup; tags: string[] }[];
  onApply: (filters: DiscoverFilters) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const isDefault = JSON.stringify(draft) === JSON.stringify(DEFAULT_FILTERS);

  return (
    <SubScreen
      title="필터"
      onClose={onClose}
      className="r-discover-filter"
      right={
        <button
          type="button"
          className="r-subscreen__action"
          disabled={isDefault}
          onClick={() => setDraft(DEFAULT_FILTERS)}
        >
          초기화
        </button>
      }
      footer={
        <button type="button" className="r-button r-button--primary" onClick={() => onApply(draft)}>
          적용하기
        </button>
      }
    >
      <FilterGroup title="맛객 관계">
        <div className="r-discover-filter__scope">
          {SCOPE_OPTIONS.map((option) => (
            <FilterChip
              key={option.value}
              label={option.sheetLabel}
              isOn={draft.scope === option.value}
              onToggle={() => setDraft({ ...draft, scope: option.value })}
            />
          ))}
        </div>
        <p className="r-discover-filter__note">
          <Icon name="info" />
          선택한 조건이 모두 맞는 곳을 보여줘요.
        </p>
      </FilterGroup>

      {cuisineOptions.length > 0 && (
        <FilterGroup title="음식 종류">
          <div className="r-chips r-chips--wrap">
            {cuisineOptions.map((cuisine) => (
              <FilterChip
                key={cuisine}
                label={cuisine}
                isOn={draft.cuisine === cuisine}
                onToggle={() => setDraft({ ...draft, cuisine: draft.cuisine === cuisine ? "" : cuisine })}
              />
            ))}
          </div>
        </FilterGroup>
      )}

      {tagSections.map((section) => (
        <FilterGroup key={section.group} title={TASTE_TAG_GROUP_LABELS[section.group]}>
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

      <FilterGroup title="매장 이용">
        <div className="r-chips r-chips--wrap" role="group" aria-label="매장 이용">
          {FILTER_CONDITIONS.map((condition) => (
            <FilterChip
              key={condition}
              label={condition}
              isOn={draft.conditions.includes(condition)}
              onToggle={() => setDraft({ ...draft, conditions: toggleItem(draft.conditions, condition) })}
            />
          ))}
        </div>
      </FilterGroup>
    </SubScreen>
  );
}
