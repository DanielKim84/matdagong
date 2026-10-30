import { useRef, useState } from "react";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { relativeTime } from "../../components/ui";
import {
  avatarFallback,
  avatarSource,
  formatPrice,
  MY_RECORD_ID,
  photoIndexOf,
  recordMenus,
  type PlacePhoto,
  type PlaceRecord,
} from "./placeRecords";

type Props = {
  records: PlaceRecord[];
  photos: PlacePhoto[];
  subscribedIds: string[];
  onOpenPhoto: (index: number) => void;
  onSubscribe: (tasterId: string) => void;
  onEditOwn: () => void;
  onOwnToLike: () => void;
};

/** 맛객별 기록 카드를 옆으로 넘겨 비교합니다. */
export default function PlaceRecordCards({ records, photos, subscribedIds, onOpenPhoto, onSubscribe, onEditOwn, onOwnToLike }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function cardStep() {
    const first = track.current?.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + 12 : 1;
  }
  function onScroll() {
    const element = track.current;
    if (!element) return;
    setActive(Math.min(records.length - 1, Math.round(element.scrollLeft / cardStep())));
  }
  function scrollTo(index: number) {
    track.current?.scrollTo({ left: index * cardStep(), behavior: "smooth" });
  }

  return (
    <div className="r-place-records">
      <div className="r-place-records__head">
        <h2 className="r-display">맛객들의 기록</h2>
        {records.length > 1 && <span className="r-muted">{active + 1} / {records.length}</span>}
      </div>
      <div className="r-place-records__track" ref={track} onScroll={onScroll}>
        {records.map((record) => (
          <RecordCard
            key={record.tasterId}
            record={record}
            photos={photos}
            subscribed={subscribedIds.includes(record.tasterId)}
            onOpenPhoto={onOpenPhoto}
            onSubscribe={onSubscribe}
            onEditOwn={onEditOwn}
            onOwnToLike={onOwnToLike}
          />
        ))}
      </div>
      {records.length > 1 && records.length <= 12 && (
        <div className="r-place-dots" role="tablist" aria-label="기록 카드">
          {records.map((record, index) => (
            <button
              type="button"
              role="tab"
              key={record.tasterId}
              aria-selected={index === active}
              aria-label={`${index + 1}번째 기록, ${record.tasterName}`}
              onClick={() => scrollTo(index)}
            ><span /></button>
          ))}
        </div>
      )}
    </div>
  );
}

function RecordCard({ record, photos, subscribed, onOpenPhoto, onSubscribe, onEditOwn, onOwnToLike }: {
  record: PlaceRecord;
  photos: PlacePhoto[];
  subscribed: boolean;
  onOpenPhoto: (index: number) => void;
  onSubscribe: (tasterId: string) => void;
  onEditOwn: () => void;
  onOwnToLike: () => void;
}) {
  const mine = record.tasterId === MY_RECORD_ID;
  const menus = recordMenus(record);
  const recordPhotos = record.photos ?? [];
  const shownPhotos = recordPhotos.slice(0, 3);
  const morePhotos = recordPhotos.length - shownPhotos.length;
  const when = relativeTime(record.recordedAt);
  const meta = [when && `${when} 기록`, record.tag].filter(Boolean).join(" · ");
  const conditions = record.visitConditions ?? [];
  const author = (
    <>
      <Avatar src={avatarSource(record)} fallbackSrc={avatarFallback(record)} name={record.tasterName} variant={record.avatarVariant} />
      <span className="r-place-record__who">
        <b>{record.tasterName}</b>
        {meta && <small>{meta}</small>}
      </span>
    </>
  );

  return (
    <article className="r-card r-place-record" aria-label={`${record.tasterName}의 기록`}>
      <header className="r-place-record__head">
        {mine
          ? <div className="r-place-record__author">{author}</div>
          : <button type="button" className="r-place-record__author" onClick={() => go("profile", record.tasterId)} aria-label={`${record.tasterName} 프로필 보기`}>{author}</button>}
        {mine
          ? <span className="r-place-badge">{record.visibility === "PRIVATE" ? "내 기록 · 비공개" : "내 기록"}</span>
          : subscribed
            ? <span className="r-place-badge">구독 중</span>
            : record.matchScore ? <span className="r-match">취향 {record.matchScore}%</span> : null}
      </header>

      {record.note?.trim() && <p className="r-place-record__note r-display">&ldquo;{record.note.trim()}&rdquo;</p>}

      {shownPhotos.length > 0 && (
        <div className="r-place-record__photos">
          {shownPhotos.map((src, index) => {
            const last = index === shownPhotos.length - 1 && morePhotos > 0;
            return (
              <button
                type="button"
                key={`${src}-${index}`}
                onClick={() => onOpenPhoto(Math.max(0, photoIndexOf(photos, src)))}
                aria-label={last ? `사진 ${morePhotos}장 더 보기` : `${record.tasterName}님 사진 ${index + 1} 크게 보기`}
              >
                <img src={src} alt="" loading="lazy" decoding="async" />
                {last && <span aria-hidden="true">+{morePhotos}</span>}
              </button>
            );
          })}
        </div>
      )}

      {menus.length > 0 && (
        <ul className="r-place-record__menus" aria-label="추천 메뉴">
          {menus.map((menu, index) => {
            const photoIndex = photoIndexOf(photos, menu.photo);
            const label = <><span>{menu.name}</span>{menu.price != null && <b>{formatPrice(menu.price)}</b>}</>;
            return (
              <li key={`${menu.name}-${index}`}>
                {photoIndex >= 0
                  ? <button type="button" onClick={() => onOpenPhoto(photoIndex)} aria-label={`${menu.name} 사진 보기`}><Icon name="image" />{label}</button>
                  : <div>{label}</div>}
              </li>
            );
          })}
        </ul>
      )}

      {(record.tags?.length ?? 0) > 0 && (
        <div className="r-tags">{record.tags!.map((tag) => <span className="r-tag" key={tag}>{tag}</span>)}</div>
      )}
      {conditions.length > 0 && (
        <div className="r-tags" aria-label="방문 정보">{conditions.map((condition) => <span className="r-tag r-tag--neutral" key={condition}>{condition}</span>)}</div>
      )}

      <footer className="r-place-record__actions">
        {mine ? <>
          <button type="button" className="r-button r-button--pill r-button--soft" onClick={onEditOwn}>기록 수정</button>
          <button type="button" className="r-button r-button--pill r-button--secondary" onClick={onOwnToLike}>내 맛집으로 바꾸기</button>
        </> : <>
          {!subscribed && (
            <button type="button" className="r-button r-button--pill r-button--primary" onClick={() => onSubscribe(record.tasterId)}>
              구독하고 새 기록 받기
            </button>
          )}
          <button type="button" className="r-button r-button--pill r-button--secondary" onClick={() => go("profile", record.tasterId)}>
            프로필 보기
          </button>
        </>}
      </footer>
    </article>
  );
}
