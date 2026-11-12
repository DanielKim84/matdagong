import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import TagGroupList from "../../components/TagGroupList";
import { EmptyState } from "../../components/ui";
import { groupTagsByDictionary } from "../../models/tasteTags";

/**
 * 맛객 프로필 "취향" 탭: 공개 취향 태그를 묶음별로 보여 줍니다(모양은 맛집 상세와 같은 TagGroupList).
 * 다른 맛객이면 matched를 넘겨 내 추천 취향과 겹치는 태그를 관계 배지로 표시하고, 내 프로필이면 비교 없이 태그만 둡니다.
 */
export default function TasteGroups({ tags, matched }: { tags: string[]; matched?: string[] }) {
  const app = useAppData();
  if (!tags.length) return <EmptyState icon="heart" title="아직 공개한 취향이 없어요" className="r-card" />;

  // 태그 사전을 못 받았거나 사전에서 빠진 이름도 버리지 않고 "기타" 묶음으로 맨 뒤에 둡니다.
  const groups = groupTagsByDictionary(tags, (tag) => app.tasteTags.find((option) => option.name === tag)?.tagGroup);
  const matchedCount = matched ? tags.filter((tag) => matched.includes(tag)).length : 0;

  return (
    <section className="r-tasters-taste" aria-label="취향">
      {matched && (
        <p className="r-tasters-taste__legend">
          <span className="r-tag r-tag--mine" aria-hidden="true">
            <Icon name="check" />
            나와 같아요
          </span>
          {matchedCount > 0 ? `나와 겹치는 취향이 ${matchedCount}개 있어요.` : "아직 나와 겹치는 취향은 없어요."}
        </p>
      )}
      <TagGroupList groups={groups} matched={matched} />
    </section>
  );
}
