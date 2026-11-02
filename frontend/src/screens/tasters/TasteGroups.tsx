import { useAppData } from "../../app/AppData";
import { EmptyState } from "../../components/ui";
import { PROFILE_TASTE_TAG_GROUP_LABELS } from "../../models/tasteTags";

/** 공개 취향 태그를 분류별로 묶고, 나와 겹치는 태그는 강조합니다. */
export default function TasteGroups({ tags, matched }: { tags: string[]; matched: string[] }) {
  const app = useAppData();
  if (!tags.length) return <EmptyState icon="heart" title="아직 공개한 취향이 없어요" />;
  const groups = new Map<string, string[]>();
  tags.forEach((tag) => {
    const group = app.tasteTags.find((option) => option.name === tag)?.tagGroup;
    const label = group ? PROFILE_TASTE_TAG_GROUP_LABELS[group] : "기타";
    groups.set(label, [...(groups.get(label) ?? []), tag]);
  });
  return (
    <div className="r-tasters-taste">
      {[...groups.entries()].map(([label, items]) => (
        <section key={label}>
          <h2>{label}</h2>
          <div className="r-tags">
            {items.map((tag) => (
              <span key={tag} className={matched.includes(tag) ? "r-tag" : "r-tag r-tag--neutral"}>
                {tag}
                {matched.includes(tag) ? " ✓" : ""}
              </span>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
