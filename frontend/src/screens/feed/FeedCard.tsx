import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon, { type IconName } from "../../components/Icon";
import PlaceThumb from "../../components/PlaceThumb";
import Sheet from "../../components/Sheet";
import { formatRelativeTime } from "../../utils/format";
import { sharePlaceWithNotice } from "../../utils/placeLinks";
import { splitReason } from "../record/recordModel";
import { NEW_BADGE_MS, type FeedRecord } from "./feedRecords";

/**
 * 피드 기록 한 장(보드 07-01): 작성자 · "2시간 전 · 새로운 기록" · 오른쪽 ⋯ → 둥근 큰 사진 → 가게 이름 · > → 한 줄 추천.
 * 카드 바탕 없이 줄 사이를 옅은 선으로 나눕니다. 사진·이름을 누르면 맛집 상세로 가고, ⋯에서 공유·가볼 곳 저장·프로필을 엽니다.
 */
export default function FeedCard({ record }: { record: FeedRecord }) {
  const { likedPlaceIds, actions } = useAppData();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { place, taster, author } = record;
  const isLiked = likedPlaceIds.includes(place.id);
  const when = formatRelativeTime(taster.recordedAt);
  const isNew = record.time > 0 && Date.now() - record.time < NEW_BADGE_MS;
  const note = taster.note.trim();
  const headline = splitReason(note).headline || note;
  const menu: { icon: IconName; label: string; onPick: () => void }[] = [
    { icon: "share", label: "맛집 공유", onPick: () => void sharePlaceWithNotice(place, actions.notify) },
    {
      icon: "heart",
      label: isLiked ? "가볼 곳에서 빼기" : "가볼 곳에 저장",
      onPick: () => void actions.chooseLike(place.id),
    },
    { icon: "user", label: `${author.name} 프로필 보기`, onPick: () => go("profile", author.id) },
  ];

  return (
    <article className="r-feed-card">
      <header className="r-feed-card__head">
        <button type="button" className="r-feed-card__author" onClick={() => go("profile", author.id)}>
          <Avatar src={author.avatar} name={author.name} variant={author.variant} />
          <span className="r-feed-card__who">
            <b>{author.name}</b>
            <small>{[when, isNew ? "새로운 기록" : "기록"].filter(Boolean).join(" · ")}</small>
          </span>
        </button>
        <button
          type="button"
          className="r-icon-button r-feed-card__more"
          aria-label={`${place.name} 기록 더 보기`}
          onClick={() => setIsMenuOpen(true)}
        >
          <Icon name="more" />
        </button>
      </header>

      <button
        type="button"
        className="r-feed-card__photo"
        onClick={() => go("place", place.id)}
        aria-label={`${place.name} 맛집 보기`}
      >
        {record.photo ? (
          <img src={record.photo} alt="" loading="lazy" decoding="async" />
        ) : (
          <PlaceThumb place={place} fallback="icon" className="r-feed-card__no-photo" />
        )}
      </button>

      <button type="button" className="r-feed-card__title" onClick={() => go("place", place.id)}>
        <b>{place.name}</b>
        <Icon name="chevron" />
      </button>
      {headline && <p className="r-feed-card__note">“{headline}”</p>}

      {isMenuOpen && (
        <Sheet title={place.name} onClose={() => setIsMenuOpen(false)} className="r-record-menu">
          <div className="r-record-menu__list">
            {menu.map((item) => (
              <button
                key={item.label}
                type="button"
                className="r-card r-record-menu__item is-compact"
                onClick={() => {
                  setIsMenuOpen(false);
                  item.onPick();
                }}
              >
                <span className="r-record-menu__icon">
                  <Icon name={item.icon} filled={item.icon === "heart" && isLiked} />
                </span>
                <span className="r-record-menu__copy">
                  <b>{item.label}</b>
                </span>
                <Icon name="chevron" />
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </article>
  );
}
