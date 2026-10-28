import type { FoodFocus, TasteTag } from "../services/community";
import { groupsForFocus, type TasteTagGroup } from "../models/tasteTags";
import Icon, { type IconName } from "./Icon";

const sections: { id: TasteTagGroup; label: string; hint: string; icon: IconName; limit: number }[] = [
  { id: "CUISINE", label: "음식 종류", hint: "어떤 음식 분야를 즐겨 찾나요?", icon: "fork", limit: 5 },
  { id: "TASTE", label: "맛과 메뉴", hint: "좋아하는 맛이나 메뉴를 골라요.", icon: "heart", limit: 5 },
  { id: "CAFE", label: "카페와 디저트", hint: "커피와 달콤한 취향을 골라요.", icon: "coffee", limit: 5 },
  { id: "OCCASION", label: "방문 스타일", hint: "함께 가거나 즐기는 상황을 골라요.", icon: "route", limit: 5 },
  { id: "VISIT", label: "피하고 싶은 조건", hint: "이 조건이 있는 장소를 추천에서 빼요.", icon: "pin", limit: 5 },
];

/** 태그를 성격별로 나누고, 각 묶음마다 별도 선택 한도를 적용합니다. */
export default function TasteTagPicker({
  options,
  value,
  onChange,
  focus,
  groupsToShow = ["CUISINE", "TASTE", "CAFE", "OCCASION"],
  showCategoryLabels = true,
}: {
  options: TasteTag[];
  value: string[];
  onChange: (tags: string[]) => void;
  focus?: FoodFocus;
  groupsToShow?: TasteTagGroup[];
  showCategoryLabels?: boolean;
}) {
  const visibleGroups = focus ? groupsForFocus(focus) : groupsToShow;

  function toggle(name: string, selectedCount: number, limit: number) {
    onChange(
      value.includes(name)
        ? value.filter((tag) => tag !== name)
        : selectedCount < limit
          ? [...value, name]
          : value,
    );
  }

  return (
    <div className="taste-tag-picker">
      {sections.map((section) => {
        if (!visibleGroups.includes(section.id)) return null;
        const tags = options.filter((tag) => tag.tagGroup === section.id);
        if (!tags.length) return null;
        const selectedCount = tags.filter((tag) => value.includes(tag.name)).length;
        return (
          <section key={section.id} className={`taste-tag-group taste-tag-group--${section.id.toLowerCase()}`}>
            {showCategoryLabels && (
              <header className="taste-tag-group__header">
                <span className="taste-tag-group__icon"><Icon name={section.icon} /></span>
                <span className="taste-tag-group__titles">
                  <b>{section.label}</b>
                  <small>{section.hint}</small>
                </span>
                <span className="taste-tag-group__count" aria-live="polite"><b>{selectedCount}</b><i>/{section.limit} 선택</i></span>
              </header>
            )}
            <div className="taste-tag-options" role="group" aria-label={section.label}>
              {tags.map((tag) => {
                const selected = value.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    aria-pressed={selected}
                    disabled={!selected && selectedCount >= section.limit}
                    className={selected ? "selected" : ""}
                    onClick={() => toggle(tag.name, selectedCount, section.limit)}
                  >
                    <span className="taste-tag-label"><i>#</i>{tag.name}</span>
                    <span className={`taste-tag-check ${selected ? "is-selected" : ""}`} aria-hidden="true">
                      <Icon name="check" />
                    </span>
                  </button>
                );
              })}
            </div>
            {!showCategoryLabels && <small className="taste-tag-group__compact-count" aria-live="polite">{selectedCount}/{section.limit}개 선택</small>}
          </section>
        );
      })}
    </div>
  );
}
