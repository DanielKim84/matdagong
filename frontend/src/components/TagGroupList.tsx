import type { TagGroupSection } from "../models/tasteTags";
import GroupIcon, { tagGroupLook } from "./GroupIcon";
import HashTag from "./HashTag";

/**
 * 묶음별 태그 보여 주기(맛집 상세 "이런 곳이에요", 맛객 프로필 "취향")의 공통 모양입니다. 발견 필터와 같이
 * 분류 아이콘(GroupIcon) + 묶음 이름 + 개수를 머리에 두고, 태그는 공통 HashTag(크림색 칩 + 코랄 #)로 둡니다.
 * 묶음마다 필터처럼 테두리·그림자가 있는 흰 카드로 감싸, 흰 기록 카드 안에서도 묶음이 나뉘어 보입니다.
 * 묶음은 models/tasteTags의 groupTagsByDictionary로 사전 순서대로 만들어 넘깁니다.
 * matched를 넘기면 그 태그만 관계 배지(코랄 채움 + 체크)로 바꿔 나와 같은 취향을 표시합니다.
 */
export default function TagGroupList({ groups, matched }: { groups: TagGroupSection[]; matched?: string[] }) {
  return (
    <ul className="r-tag-groups">
      {groups.map((group) => (
        <li key={group.key} className="r-tag-group">
          <p className="r-tag-group__head">
            <GroupIcon look={tagGroupLook(group.key)} />
            {group.label}
            <small>{group.tags.length}</small>
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
