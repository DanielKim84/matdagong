import { useRef, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import PaginationDots from "../../components/PaginationDots";
import { SectionHead } from "../../components/ui";
import { isMyTaster } from "../../models/place";
import { formatRelativeTime, formatWon } from "../../utils/format";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import { photoIndexOf, recordMenus, type PlacePhoto, type PlaceRecord } from "./placeRecords";

/** 맛객별 기록 카드를 옆으로 넘겨 비교합니다. */
export default function PlaceRecordCards({
  records,
  photos,
  onOpenPhoto,
  onEditOwn,
  onOwnToLike,
}: {
  records: PlaceRecord[];
  photos: PlacePhoto[];
  onOpenPhoto: (index: number) => void;
  onEditOwn: () => void;
  onOwnToLike: () => void;
}) {
  const { subscriptionIds, actions } = useAppData();
  const track = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  function cardStep() {
    const first = track.current?.firstElementChild;
    return first instanceof HTMLElement ? first.offsetWidth + 12 : 1;
  }
  function syncActive() {
    const element = track.current;
    if (!element) return;
    setActiveIndex(Math.min(records.length - 1, Math.round(element.scrollLeft / cardStep())));
  }
  function scrollToCard(index: number) {
    track.current?.scrollTo({ left: index * cardStep(), behavior: "smooth" });
  }

  return (
    <div className="r-place-records">
      <SectionHead
        title="맛객들의 기록"
        meta={records.length > 1 && `${activeIndex + 1} / ${records.length}`}
        className="r-place-records__head"
      />
      <div className="r-place-records__track" ref={track} onScroll={syncActive}>
        {records.map((record) => (
          <RecordCard
            key={record.tasterId}
            record={record}
            photos={photos}
            isSubscribed={subscriptionIds.includes(record.tasterId)}
            onOpenPhoto={onOpenPhoto}
            onSubscribe={actions.openSubscription}
            onEditOwn={onEditOwn}
            onOwnToLike={onOwnToLike}
          />
        ))}
      </div>
      {records.length > 1 && records.length <= 12 && (
        <PaginationDots activeIndex={activeIndex} total={records.length} onSelect={scrollToCard} label="기록 카드" />
      )}
    </div>
  );
}

function RecordCard({
  record,
  photos,
  isSubscribed,
  onOpenPhoto,
  onSubscribe,
  onEditOwn,
  onOwnToLike,
}: {
  record: PlaceRecord;
  photos: PlacePhoto[];
  isSubscribed: boolean;
  onOpenPhoto: (index: number) => void;
  onSubscribe: (tasterId: string) => void;
  onEditOwn: () => void;
  onOwnToLike: () => void;
}) {
  const isMine = isMyTaster(record);
  const menus = recordMenus(record);
  const recordPhotos = record.photos ?? [];
  const shownPhotos = recordPhotos.slice(0, 3);
  const morePhotos = recordPhotos.length - shownPhotos.length;
  const when = formatRelativeTime(record.recordedAt);
  const meta = [when && `${when} 기록`, record.tag].filter(Boolean).join(" · ");
  const tags = record.tags ?? [];
  const conditions = record.visitConditions ?? [];
  const author = (
    <>
      <Avatar
        src={avatarSource(record.tasterId, record.avatar)}
        fallbackSrc={avatarFallback(record.tasterId, record.avatar)}
        name={record.tasterName}
        variant={record.avatarVariant}
      />
      <span className="r-place-record__who">
        <b>{record.tasterName}</b>
        {meta && <small>{meta}</small>}
      </span>
    </>
  );

  return (
    <article className="r-card r-place-record" aria-label={`${record.tasterName}의 기록`}>
      <header className="r-place-record__head">
        {isMine ? (
          <div className="r-place-record__author">{author}</div>
        ) : (
          <button
            type="button"
            className="r-place-record__author"
            onClick={() => go("profile", record.tasterId)}
            aria-label={`${record.tasterName} 프로필 보기`}
          >
            {author}
          </button>
        )}
        {isMine ? (
          <span className="r-place-badge">{record.visibility === "PRIVATE" ? "내 기록 · 비공개" : "내 기록"}</span>
        ) : isSubscribed ? (
          <span className="r-place-badge">구독 중</span>
        ) : record.matchScore ? (
          <span className="r-match">취향 {record.matchScore}%</span>
        ) : null}
      </header>

      {record.note?.trim() && <p className="r-place-record__note r-display">&ldquo;{record.note.trim()}&rdquo;</p>}

      {shownPhotos.length > 0 && (
        <div className="r-place-record__photos">
          {shownPhotos.map((src, index) => {
            const isLast = index === shownPhotos.length - 1 && morePhotos > 0;
            return (
              <button
                type="button"
                key={`${src}-${index}`}
                onClick={() => onOpenPhoto(Math.max(0, photoIndexOf(photos, src)))}
                aria-label={
                  isLast ? `사진 ${morePhotos}장 더 보기` : `${record.tasterName}님 사진 ${index + 1} 크게 보기`
                }
              >
                <img src={src} alt="" loading="lazy" decoding="async" />
                {isLast && <span aria-hidden="true">+{morePhotos}</span>}
              </button>
            );
          })}
        </div>
      )}

      {menus.length > 0 && (
        <ul className="r-place-record__menus" aria-label="추천 메뉴">
          {menus.map((menu, index) => {
            const photoIndex = photoIndexOf(photos, menu.photo);
            const label = (
              <>
                <span>{menu.name}</span>
                {menu.price != null && <b>{formatWon(menu.price)}</b>}
              </>
            );
            return (
              <li key={`${menu.name}-${index}`}>
                {photoIndex >= 0 ? (
                  <button type="button" onClick={() => onOpenPhoto(photoIndex)} aria-label={`${menu.name} 사진 보기`}>
                    <Icon name="image" />
                    {label}
                  </button>
                ) : (
                  <div>{label}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {tags.length > 0 && (
        <div className="r-tags">
          {tags.map((tag) => (
            <span className="r-tag" key={tag}>
              {tag}
            </span>
          ))}
        </div>
      )}
      {conditions.length > 0 && (
        <div className="r-tags" aria-label="방문 정보">
          {conditions.map((condition) => (
            <span className="r-tag r-tag--neutral" key={condition}>
              {condition}
            </span>
          ))}
        </div>
      )}

      <footer className="r-place-record__actions">
        {isMine ? (
          <>
            <button type="button" className="r-button r-button--pill r-button--soft" onClick={onEditOwn}>
              기록 수정
            </button>
            <button type="button" className="r-button r-button--pill r-button--secondary" onClick={onOwnToLike}>
              내 맛집으로 바꾸기
            </button>
          </>
        ) : (
          <>
            {!isSubscribed && (
              <button
                type="button"
                className="r-button r-button--pill r-button--primary"
                onClick={() => onSubscribe(record.tasterId)}
              >
                구독하고 새 기록 받기
              </button>
            )}
            <button
              type="button"
              className="r-button r-button--pill r-button--secondary"
              onClick={() => go("profile", record.tasterId)}
            >
              프로필 보기
            </button>
          </>
        )}
      </footer>
    </article>
  );
}
