import { go } from "../app/navigation";
import type { Place } from "../models/place";
import { FoodPhoto } from "./BrandAssets";
import Icon, { type IconName } from "./Icon";

/** 오른쪽 위 이름표입니다. isMuted는 별로였어요처럼 회색으로 낮춰 보여 줄 이름표입니다. */
export type PlaceTileBadge = { label: string; isMuted?: boolean };

type Props = {
  place: Place;
  isLiked?: boolean;
  onLike?: () => void;
  /** 하트 대신 오른쪽 위에 붙일 이름표(내가 등록한 곳·나만 보기·다녀온 곳, 그 아래 별로였어요)입니다. */
  badges?: PlaceTileBadge[];
  photo?: string;
  /** 카드 아래에 둘 버튼(별로였던 곳의 되돌리기 등)입니다. */
  action?: { label: string; icon?: IconName; onClick: () => void };
  isSelected?: boolean;
  /** 넘기면 고르기 모드입니다. 카드를 눌러도 상세로 가지 않고 선택만 바꾸며, 왼쪽 위에 체크 표시를 둡니다. */
  onSelect?: () => void;
};

/**
 * 모음·별로였던 곳 화면의 장소 카드: 사진, 이름, 분류·주소와 오른쪽 위 하트 또는 이름표.
 * 하트를 쓰지 않는 곳(내 기록 등)은 onLike 대신 badges를 넘깁니다. 둘 다 없으면 오른쪽 위를 비워 둡니다.
 */
export default function PlaceTile({
  place,
  isLiked = false,
  onLike,
  badges,
  photo,
  action,
  isSelected = false,
  onSelect,
}: Props) {
  return (
    <article className={`r-card r-me-place ${isSelected ? "is-selected" : ""}`}>
      <button
        type="button"
        className="r-me-place__open"
        onClick={onSelect ?? (() => go("place", place.id))}
        aria-pressed={onSelect ? isSelected : undefined}
      >
        {onSelect && (
          <span className={`r-me-check r-me-place__check ${isSelected ? "is-on" : ""}`} aria-hidden="true">
            <Icon name="check" />
          </span>
        )}
        <span className="r-me-place__photo">
          {photo ? <img src={photo} alt="" loading="lazy" decoding="async" /> : <FoodPhoto place={place} />}
        </span>
        <span className="r-me-place__copy">
          <b>{place.name}</b>
          <small>{[place.category, place.address].filter(Boolean).join(" · ")}</small>
          <em>추천한 맛객 {place.recordCount}명</em>
        </span>
      </button>
      {badges?.length ? (
        <span className="r-me-place__badges">
          {badges.map((badge) => (
            <span key={badge.label} className={`r-tag ${badge.isMuted ? "r-tag--muted" : "r-tag--mine"}`}>
              {badge.label}
            </span>
          ))}
        </span>
      ) : (
        onLike && (
          <button
            type="button"
            className={`r-me-place__like ${isLiked ? "is-on" : ""}`}
            onClick={onLike}
            aria-label={isLiked ? `${place.name} 저장 바꾸기` : `${place.name} 저장`}
            aria-pressed={isLiked}
          >
            <Icon name="heart" filled={isLiked} />
          </button>
        )
      )}
      {action && (
        <button
          type="button"
          className="r-button r-button--pill r-button--soft r-me-place__action"
          onClick={action.onClick}
        >
          {action.icon && <Icon name={action.icon} />}
          {action.label}
        </button>
      )}
    </article>
  );
}
