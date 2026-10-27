import type { TasteTag } from "../services/community";
import Icon from "./Icon";

const categories = [
  { id: "MENU", label: "메뉴·맛" },
  { id: "VISIT", label: "방문 조건" },
] as const;

/** 같은 태그를 가입 선호도와 공개 맛객 프로필에서 함께 선택합니다. */
export default function TasteTagPicker({
  options,
  value,
  onChange,
  categoriesToShow = ["MENU", "VISIT"],
  limit = 5,
  showCategoryLabels = true,
}: {
  options: TasteTag[];
  value: string[];
  onChange: (tags: string[]) => void;
  categoriesToShow?: TasteTag["category"][];
  limit?: number;
  showCategoryLabels?: boolean;
}) {
  function toggle(name: string) {
    onChange(
      value.includes(name)
        ? value.filter((tag) => tag !== name)
        : value.length < limit
          ? [...value, name]
          : value,
    );
  }

  return (
    <div className="taste-tag-picker">
      {categories.map((category) => {
        if (!categoriesToShow.includes(category.id)) return null;
        const group = options.filter((tag) => tag.category === category.id);
        if (!group.length) return null;
        return (
          <section key={category.id}>
            {showCategoryLabels && <h3>{category.label}</h3>}
            <div>
              {group.map((tag) => {
                const selected = value.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    aria-pressed={selected}
                    disabled={!selected && value.length >= limit}
                    className={selected ? "selected" : ""}
                    onClick={() => toggle(tag.name)}
                  >
                    {selected && <Icon name="check" />}{tag.name}
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      <small>{value.length}/{limit}개 선택</small>
    </div>
  );
}
