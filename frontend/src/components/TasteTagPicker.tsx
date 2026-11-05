import type { FoodFocus, TasteTag } from "../models/community";
import { MENU_TASTE_TAG_GROUPS, TASTE_TAG_GROUPS, groupsForFocus, type TasteTagGroup } from "../models/tasteTags";
import Icon, { type IconName } from "./Icon";

const TASTE_TAG_GROUP_ICONS: Record<TasteTagGroup, IconName> = {
  CUISINE: "fork",
  TASTE: "heart",
  CAFE: "coffee",
  OCCASION: "route",
  VISIT: "pin",
};

/** 태그를 성격별로 나누고, 각 묶음마다 별도 선택 한도를 적용합니다. */
export default function TasteTagPicker({
  options,
  value,
  onChange,
  focus,
  groupsToShow = MENU_TASTE_TAG_GROUPS,
}: {
  options: TasteTag[];
  value: string[];
  onChange: (tags: string[]) => void;
  /** 주면 그 분야에 맞는 묶음만 보여 주고 groupsToShow는 무시합니다. */
  focus?: FoodFocus;
  groupsToShow?: readonly TasteTagGroup[];
}) {
  const visibleGroups = focus ? groupsForFocus(focus) : groupsToShow;

  function toggle(name: string, selectedCount: number, limit: number) {
    if (value.includes(name)) onChange(value.filter((tag) => tag !== name));
    else onChange(selectedCount < limit ? [...value, name] : value);
  }

  return (
    <div className="taste-tag-picker">
      {TASTE_TAG_GROUPS.map((group) => {
        if (!visibleGroups.includes(group.id)) return null;
        const tags = options.filter((tag) => tag.tagGroup === group.id);
        if (!tags.length) return null;
        const selectedCount = tags.filter((tag) => value.includes(tag.name)).length;
        return (
          <section key={group.id} className="taste-tag-group">
            <header className="taste-tag-group__header">
              <span className="taste-tag-group__icon">
                <Icon name={TASTE_TAG_GROUP_ICONS[group.id]} />
              </span>
              <span className="taste-tag-group__titles">
                <b>{group.label}</b>
                <small>{group.hint}</small>
              </span>
              <span className="taste-tag-group__count" aria-live="polite">
                <b>{selectedCount}</b>
                <i>/{group.limit} 선택</i>
              </span>
            </header>
            <div className="taste-tag-options" role="group" aria-label={group.label}>
              {tags.map((tag) => {
                const isSelected = value.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    aria-pressed={isSelected}
                    disabled={!isSelected && selectedCount >= group.limit}
                    className={isSelected ? "is-selected" : ""}
                    onClick={() => toggle(tag.name, selectedCount, group.limit)}
                  >
                    <span className="taste-tag-label">
                      <i>#</i>
                      {tag.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
