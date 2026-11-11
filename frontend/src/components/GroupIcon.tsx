import { isTasteTagGroup, type TasteTagGroup } from "../models/tasteTags";
import Icon, { type IconName } from "./Icon";

/** 묶음 머리의 연한 색 원 색입니다. ui.css의 .r-group-icon--<tone>과 짝입니다. */
type GroupTone = "amber" | "green" | "clay" | "berry" | "blue" | "teal" | "brand" | "slate" | "neutral";
export type GroupLook = { icon: IconName; tone: GroupTone };

/**
 * 취향 태그 분류마다 하나로 정한 아이콘과 색입니다. 태그 고르기, 묶음별 태그(맛집 상세·맛객 프로필), 발견 필터,
 * 태그 제안 시트가 모두 이 값을 써서 같은 분류는 어디서나 같은 모양으로 보입니다.
 */
const TAG_GROUP_LOOKS: Record<TasteTagGroup, GroupLook> = {
  CUISINE: { icon: "fork", tone: "amber" },
  TASTE: { icon: "sparkle", tone: "green" },
  CAFE: { icon: "coffee", tone: "clay" },
  DESSERT: { icon: "cake", tone: "berry" },
  TRAVEL: { icon: "car", tone: "blue" },
  MOOD: { icon: "view", tone: "teal" },
  OCCASION: { icon: "people", tone: "brand" },
  VISIT: { icon: "store", tone: "slate" },
};
/** 분류를 모르는 묶음("기타")의 모양입니다. */
const OTHER_LOOK: GroupLook = { icon: "sparkle", tone: "neutral" };

export function tagGroupLook(group: string): GroupLook {
  return isTasteTagGroup(group) ? TAG_GROUP_LOOKS[group] : OTHER_LOOK;
}

/** 묶음 머리의 연한 색 원 안 아이콘입니다. 글자 옆 장식이라 화면 읽기 프로그램에는 읽히지 않습니다. */
export default function GroupIcon({ look }: { look: GroupLook }) {
  return (
    <span className={`r-group-icon r-group-icon--${look.tone}`} aria-hidden="true">
      <Icon name={look.icon} />
    </span>
  );
}
