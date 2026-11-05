import Icon from "./Icon";

/**
 * 취향·매장 태그 하나의 공통 모양입니다. 발견 필터의 태그 칩처럼 크림색 바탕에 진한 글씨를 두고, 앞에 코랄 #을 붙입니다.
 * isMatched면 나와 같은 취향이라 관계 배지(코랄 채움)로 바꾸고 # 대신 체크를 둡니다. size="sm"은 카드 안 작은 태그입니다.
 * 고르는 칩(버튼)은 r-chip을 쓰고, 안에 HashMark만 넣어 같은 # 모양을 맞춥니다.
 */
export default function HashTag({
  tag,
  isMatched = false,
  size = "md",
  as: Tag = "span",
}: {
  tag: string;
  isMatched?: boolean;
  size?: "sm" | "md";
  as?: "span" | "li";
}) {
  return (
    <Tag className={`r-hashtag r-hashtag--${size}${isMatched ? " is-matched" : ""}`}>
      {isMatched ? <Icon name="check" /> : <HashMark />}
      {tag}
      {isMatched && <span className="visually-hidden">, 나와 같은 취향</span>}
    </Tag>
  );
}

/** 태그 앞 코랄 #. 화면 읽기 프로그램에는 읽히지 않습니다. */
export function HashMark() {
  return (
    <i className="r-hashtag__hash" aria-hidden="true">
      #
    </i>
  );
}
