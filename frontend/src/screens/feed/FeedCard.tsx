import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { relativeTime } from "../../components/ui";
import { NEW_BADGE_MS, openDirections, shortArea, type FeedRecord } from "./feedRecords";

/** 피드 기록 카드: 작성자·시각 → 사진(장소 표시) → 추천 이유·태그 → 저장·길찾기·공유. */
export default function FeedCard({
  record,
  liked,
  onLike,
  onShare,
}: {
  record: FeedRecord;
  liked: boolean;
  onLike: () => void;
  onShare: () => void;
}) {
  const { place, taster, author } = record;
  const when = relativeTime(taster.recordedAt);
  const isNew = record.time > 0 && Date.now() - record.time < NEW_BADGE_MS;
  const area = shortArea(place);
  const tags = (taster.tags ?? []).slice(0, 3);

  return (
    <article className="r-card r-feed-card">
      <header className="r-feed-card__head">
        <button type="button" className="r-feed-card__author" onClick={() => go("profile", author.id)}>
          <Avatar src={author.avatar} fallbackSrc={author.fallbackAvatar} name={author.name} variant={author.variant} />
          <span className="r-feed-card__who">
            <b>{author.name}</b>
            <small>{[when, isNew ? "새 기록" : ""].filter(Boolean).join(" · ") || "기록"}</small>
          </span>
        </button>
        {(author.matchScore ?? 0) > 0 && <span className="r-match">취향 {author.matchScore}%</span>}
      </header>

      {record.photo ? (
        <button type="button" className="r-feed-card__photo" onClick={() => go("place", place.id)} aria-label={`${place.name} 맛집 보기`}>
          <img src={record.photo} alt="" loading="lazy" decoding="async" />
          <span className="r-feed-card__place-pill">
            <Icon name="pin" />
            {place.name}{area ? ` · ${area}` : ""}
          </span>
        </button>
      ) : (
        <button type="button" className="r-feed-card__place" onClick={() => go("place", place.id)}>
          <span className="r-badge-icon"><Icon name={place.category.includes("카페") ? "coffee" : "fork"} /></span>
          <span className="r-row__copy">
            <b>{place.name}</b>
            <small>{[place.category, area].filter(Boolean).join(" · ")}</small>
          </span>
          <Icon name="chevron" />
        </button>
      )}

      <div className="r-feed-card__body">
        {record.photo && (
          <button type="button" className="r-feed-card__title" onClick={() => go("place", place.id)}>
            <b>{place.name}</b>
            {place.category && <small>{place.category}</small>}
          </button>
        )}
        {taster.note && <p className="r-feed-card__note">{taster.note}</p>}
        {tags.length > 0 && (
          <div className="r-tags">
            {tags.map((tag) => <span className="r-tag" key={tag}>{tag}</span>)}
          </div>
        )}
        <div className="r-feed-card__actions">
          <button type="button" className={`r-feed-act${liked ? " is-on" : ""}`} aria-pressed={liked} onClick={onLike}>
            <Icon name="heart" filled={liked} />{liked ? "저장됨" : "저장"}
          </button>
          <button type="button" className="r-feed-act" onClick={() => openDirections(place)}>
            <Icon name="route" />길찾기
          </button>
          <button type="button" className="r-feed-act r-feed-act--icon" aria-label={`${place.name} 공유`} onClick={onShare}>
            <Icon name="share" />
          </button>
        </div>
      </div>
    </article>
  );
}
