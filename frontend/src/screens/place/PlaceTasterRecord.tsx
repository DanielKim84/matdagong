import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { useSwipe } from "../../hooks/useSwipe";
import { isMyTaster } from "../../models/place";
import { formatRelativeTime, formatWon } from "../../utils/format";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import { photoIndexOf, recordMenus, type PlacePhoto, type PlaceRecord } from "./placeRecords";

const SHOWN_PHOTO_COUNT = 3;

/**
 * 고른 맛객 한 명의 기록. 추천 이유·사진·메뉴·취향 태그·매장 정보는 맛객마다 다르게 입력하므로
 * 다른 맛객 것과 합치지 않고 그대로 보여 줍니다. 옆으로 밀면 이전·다음 맛객으로 바뀝니다.
 */
export default function PlaceTasterRecord({
  record,
  panelId,
  photos,
  onOpenPhoto,
  onPrevious,
  onNext,
  onEditOwn,
  onOwnToLike,
}: {
  record: PlaceRecord;
  panelId: string;
  /** 이 맛객의 사진(큰 사진·사진 보기와 같은 순서) */
  photos: PlacePhoto[];
  onOpenPhoto: (index: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onEditOwn: () => void;
  onOwnToLike: () => void;
}) {
  const { subscriptionIds, actions } = useAppData();
  const swipe = useSwipe({ onLeft: onNext, onRight: onPrevious, isEnabled: !!(onNext || onPrevious) });
  const isMine = isMyTaster(record);
  const isSubscribed = subscriptionIds.includes(record.tasterId);
  const menus = recordMenus(record);
  const tags = record.tags ?? [];
  const conditions = record.visitConditions ?? [];
  const recordPhotos = record.photos ?? [];
  const shownPhotos = recordPhotos.slice(0, SHOWN_PHOTO_COUNT);
  const morePhotos = recordPhotos.length - shownPhotos.length;
  const when = formatRelativeTime(record.recordedAt);
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
        {when && <small>{when} 기록</small>}
      </span>
    </>
  );

  return (
    <article
      id={panelId}
      role="tabpanel"
      className="r-card r-place-record"
      aria-label={`${record.tasterName}의 기록`}
      {...swipe}
    >
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
                aria-label={isLast ? `사진 ${morePhotos}장 더 보기` : `사진 ${index + 1} 크게 보기`}
              >
                <img src={src} alt="" loading="lazy" decoding="async" />
                {isLast && <span aria-hidden="true">+{morePhotos}</span>}
              </button>
            );
          })}
        </div>
      )}

      {menus.length > 0 && (
        <section className="r-place-record__part">
          <h3>추천 메뉴</h3>
          <ul className="r-place-record__menus">
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
                  {photoIndex >= 0 && menu.photo ? (
                    <button
                      type="button"
                      onClick={() => onOpenPhoto(photoIndex)}
                      aria-label={`${menu.name} 사진 크게 보기`}
                    >
                      <img
                        className="r-place-record__menu-photo"
                        src={menu.photo}
                        alt=""
                        loading="lazy"
                        decoding="async"
                      />
                      {label}
                    </button>
                  ) : (
                    <div>
                      <span className="r-place-record__menu-photo is-empty" aria-hidden="true">
                        <Icon name="image" />
                      </span>
                      {label}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {tags.length > 0 && (
        <section className="r-place-record__part">
          <h3>이럴 때 좋아요</h3>
          <div className="r-tags">
            {tags.map((tag) => (
              <span className="r-tag" key={tag}>
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {conditions.length > 0 && (
        <section className="r-place-record__part">
          <h3>매장 이용 정보</h3>
          <div className="r-tags">
            {conditions.map((condition) => (
              <span className="r-tag r-tag--neutral" key={condition}>
                {condition}
              </span>
            ))}
          </div>
        </section>
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
                onClick={() => actions.openSubscription(record.tasterId)}
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
