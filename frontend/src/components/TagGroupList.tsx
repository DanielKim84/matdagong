import type { TasteTagGroup } from "../models/tasteTags";
import HashTag from "./HashTag";
import Icon, { type IconName } from "./Icon";

/** 묶음 머리의 아이콘과 아이콘 원 색입니다. 발견 필터(음식 종류·이럴 때·매장 정보)와 같은 짝을 씁니다. */
const GROUP_LOOKS: Record<TasteTagGroup, { icon: IconName; tone: "amber" | "green" | "brand" | "blue" | "berry" }> = {
  CUISINE: { icon: "fork", tone: "amber" },
  TASTE: { icon: "sparkle", tone: "green" },
  CAFE: { icon: "coffee", tone: "brand" },
  OCCASION: { icon: "route", tone: "blue" },
  VISIT: { icon: "check", tone: "berry" },
};
const FALLBACK_LOOK = { icon: "sparkle", tone: "green" } as const;

export type TagGroupItem = {
  /** 묶음 종류. 머리 아이콘과 색이 이 값으로 정해집니다. 모르는 묶음은 이럴 때와 같은 모양입니다. */
  key: string;
  label: string;
  tags: string[];
};

/**
 * 묶음별 태그 보여 주기(맛집 상세 "이런 곳이에요", 맛객 프로필 "취향")의 공통 모양입니다. 발견 필터와 같이
 * 연한 색 원 안 아이콘 + 묶음 이름 + 개수를 머리에 두고, 태그는 공통 HashTag(크림색 칩 + 코랄 #)로 둡니다.
 * 묶음마다 필터처럼 테두리·그림자가 있는 흰 카드로 감싸, 흰 기록 카드 안에서도 묶음이 나뉘어 보입니다.
 * matched를 넘기면 그 태그만 관계 배지(코랄 채움 + 체크)로 바꿔 나와 같은 취향을 표시합니다.
 */
export default function TagGroupList({ groups, matched }: { groups: TagGroupItem[]; matched?: string[] }) {
  return (
    <ul className="r-tag-groups">
      {groups.map((group) => {
        const look = GROUP_LOOKS[group.key as TasteTagGroup] ?? FALLBACK_LOOK;
        return (
          <li key={group.key} className="r-tag-group">
            <p className="r-tag-group__head">
              <span className={`r-tag-group__icon r-tag-group__icon--${look.tone}`} aria-hidden="true">
                <Icon name={look.icon} />
              </span>
              {group.label}
              <small>{group.tags.length}</small>
            </p>
            <ul className="r-tag-group__tags">
              {group.tags.map((tag) => (
                <HashTag key={tag} as="li" tag={tag} isMatched={matched?.includes(tag) ?? false} />
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
