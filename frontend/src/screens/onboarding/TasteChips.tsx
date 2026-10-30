import type { TasteTag } from "../../services/community";

// 설정 화면의 TasteTagPicker 와 같은 묶음별 선택 한도를 써서 가입 뒤 설정에서도 그대로 이어지게 합니다.
const groups: { id: TasteTag["tagGroup"]; label: string; limit: number }[] = [
  { id: "CUISINE", label: "음식 종류", limit: 5 },
  { id: "TASTE", label: "맛과 메뉴", limit: 10 },
  { id: "CAFE", label: "카페와 디저트", limit: 5 },
  { id: "OCCASION", label: "방문 스타일", limit: 10 },
];

/** 가입 취향 단계의 칩 목록입니다. 묶음 이름은 작게 두고 칩을 한 화면에 펼칩니다. */
export default function TasteChips({ options, value, onChange }: {
  options: TasteTag[];
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  return (
    <div className="r-onboarding-taste">
      {groups.map((group) => {
        const tags = options.filter((tag) => tag.tagGroup === group.id);
        if (!tags.length) return null;
        const selectedCount = tags.filter((tag) => value.includes(tag.name)).length;
        const full = selectedCount >= group.limit;
        return (
          <section key={group.id} className="r-onboarding-taste__group" aria-label={group.label}>
            <h2>
              {group.label}
              {full && <small> · 최대 {group.limit}개</small>}
            </h2>
            <div className="r-chips r-chips--wrap">
              {tags.map((tag) => {
                const selected = value.includes(tag.name);
                return (
                  <button
                    key={tag.name}
                    type="button"
                    className={`r-chip r-onboarding-taste__chip ${selected ? "is-on" : ""}`}
                    aria-pressed={selected}
                    disabled={!selected && full}
                    onClick={() => onChange(selected ? value.filter((name) => name !== tag.name) : [...value, tag.name])}
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
