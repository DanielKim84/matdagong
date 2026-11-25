import type { TagGroupSection } from "../models/tasteTags";
import HashTag from "./HashTag";

/**
 * 묶음별 태그 보여 주기(맛집 상세 "이런 스타일이에요", 맛객 프로필 "취향")의 공통 모양입니다(보드 09-02).
 * 묶음마다 옅은 테두리 상자에 묶음 이름과 오른쪽 코랄 "N개"를 머리에 두고, 태그는 공통 HashTag(연한 코랄 칩)로 둡니다.
 * 묶음은 models/tasteTags의 groupTagsByDictionary로 사전 순서대로 만들어 넘깁니다.
 * matched를 넘기면 그 태그만 관계 배지(코랄 채움 + 체크)로 바꿔 나와 같은 취향을 표시합니다.
 */
export default function TagGroupList({ groups, matched }: { groups: TagGroupSection[]; matched?: string[] }) {
  return (
    <ul className="r-tag-groups">
      {groups.map((group) => (
        <li key={group.key} className="r-tag-group">
          <p className="r-tag-group__head">
            {group.label}
            <small>{group.tags.length}개</small>
          </p>
          <ul className="r-tag-group__tags">
            {group.tags.map((tag) => (
              <HashTag key={tag} as="li" tag={tag} isMatched={matched?.includes(tag) ?? false} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
