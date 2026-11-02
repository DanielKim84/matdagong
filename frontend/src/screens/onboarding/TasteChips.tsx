import type { TasteTag } from "../../models/community";
import { MENU_TASTE_TAG_GROUPS, TASTE_TAG_GROUPS } from "../../models/tasteTags";

// 가입 취향 단계는 메뉴 취향 묶음만 보여 줍니다. 한도는 설정 화면과 같은 TASTE_TAG_GROUPS 값을 씁니다.
const MENU_GROUPS = TASTE_TAG_GROUPS.filter((group) => MENU_TASTE_TAG_GROUPS.includes(group.id));

/** 가입 취향 단계의 칩 목록입니다. 묶음 이름은 작게 두고 칩을 한 화면에 펼칩니다. */
export default function TasteChips({
  options,
  value,
  onChange,
}: {
  options: TasteTag[];
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  return (
    <div className="r-onboarding-taste">
      {MENU_GROUPS.map((group) => {
        const tags = options.filter((tag) => tag.tagGroup === group.id);
        if (!tags.length) return null;
        const selectedCount = tags.filter((tag) => value.includes(tag.name)).length;
        const isFull = selectedCount >= group.limit;
        return (
          <section key={group.id} className="r-onboarding-taste__group" aria-label={group.label}>
            <h2>
              {group.label}
              {isFull && <small> · 최대 {group.limit}개</small>}
            </h2>
            <div className="r-chips r-chips--wrap">
              {tags.map((tag) => {
                const isSelected = value.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    className={`r-chip r-onboarding-taste__chip ${isSelected ? "is-on" : ""}`}
                    aria-pressed={isSelected}
                    disabled={!isSelected && isFull}
                    onClick={() =>
                      onChange(isSelected ? value.filter((name) => name !== tag.name) : [...value, tag.name])
                    }
                  >
                    {tag.name}
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
