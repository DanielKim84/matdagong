import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import TagGroupList from "../../components/TagGroupList";
import TasteScore from "../../components/TasteScore";
import TasterAvatar from "../../components/TasterAvatar";
import { useSwipe } from "../../hooks/useSwipe";
import { isMyTaster } from "../../models/place";
import { formatRelativeTime, formatWon } from "../../utils/format";
import TasterReportButton from "../tasters/TasterReportButton";
import { photoIndexOf, recordMenus, recordTagGroups, type PlacePhoto, type PlaceRecord } from "./placeRecords";

/**
 * 고른 맛객 한 명의 기록 카드: 추천 이유 → 추천 메뉴(메뉴 사진) → 이런 곳이에요(묶음별 태그·매장 이용).
 * 맛객마다 다르게 입력하므로 다른 맛객 것과 합치지 않습니다. 대표 사진은 위쪽 큰 사진(PlaceHero)에만 둡니다.
 * 옆으로 밀면 이전·다음 맛객으로 바뀝니다.
 */
export default function PlaceTasterRecord({
  record,
  placeId,
  panelId,
  photos,
  onOpenPhoto,
  onPrevious,
  onNext,
  onChangeOwnVisibility,
  onDeleteOwn,
}: {
  record: PlaceRecord;
  /** 이 기록의 장소. 신고할 때 어떤 기록이었는지 함께 보냅니다. */
  placeId: string;
  panelId: string;
  /** 이 맛객의 사진(큰 사진·사진 보기와 같은 순서) */
  photos: PlacePhoto[];
  onOpenPhoto: (index: number) => void;
  onPrevious?: () => void;
  onNext?: () => void;
  /** 내 기록의 공개 범위만 바꿉니다(공개 추천 ↔ 나만 보기). */
  onChangeOwnVisibility: (visibility: "PUBLIC" | "PRIVATE") => void;
  /** 내 기록을 지웁니다. 지웠으면 true입니다. */
  onDeleteOwn: () => Promise<boolean>;
}) {
  const { subscriptionIds, tasteTags, actions } = useAppData();
  const { confirm } = useNotificationDialog();
  const swipe = useSwipe({ onLeft: onNext, onRight: onPrevious, isEnabled: !!(onNext || onPrevious) });
  const isMine = isMyTaster(record);
  const isSubscribed = subscriptionIds.includes(record.tasterId);
  const menus = recordMenus(record);
  const tagGroups = recordTagGroups(record, tasteTags);
  const when = formatRelativeTime(record.recordedAt);
  const isPrivate = record.visibility === "PRIVATE";

  // 공개 범위는 다른 사람의 지도·피드 노출이 바로 바뀌므로, 무엇이 달라지는지 알리고 확인을 받은 뒤 바꿉니다.
  async function changeVisibility() {
    const isConfirmed = await confirm(
      isPrivate
        ? {
            title: "공개 추천으로 바꿀까요?",
            message: "남긴 사진·메뉴·태그 그대로 다른 맛객의 지도와 피드에 보여요.",
            confirmLabel: "공개할게요",
            tone: "info",
          }
        : {
            title: "나만 보기로 바꿀까요?",
            message: "기록은 그대로 남고, 다른 사람의 지도와 피드에서는 빠져요.",
            confirmLabel: "나만 볼게요",
            tone: "info",
          },
    );
    if (isConfirmed) onChangeOwnVisibility(isPrivate ? "PUBLIC" : "PRIVATE");
  }

  // 지우면 되돌릴 수 없으므로 숨기기(나만 보기)라는 다른 길도 함께 알려 주고 확인을 받습니다.
  async function deleteRecord() {
    const isConfirmed = await confirm({
      title: "이 기록을 지울까요?",
      message: "남긴 사진·메뉴·태그가 모두 지워지고 되돌릴 수 없어요. 잠시 숨기려면 나만 보기로 바꿔 보세요.",
      confirmLabel: "지울게요",
      tone: "danger",
    });
    if (isConfirmed) await onDeleteOwn();
  }
  // 맛객 목록·발견 카드와 같은 배치: 내 기록·구독 중은 머리 오른쪽 끝, 신뢰·취향 칩은 이름·날짜 아래 줄(이름이 잘리지 않게).
  const author = (
    <>
      <TasterAvatar taster={record} />
      <span className="r-place-record__who">
        <b>{record.tasterName}</b>
        {when && <small>{when} 기록</small>}
        {!isMine && <TasteScore taster={record} />}
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
        {(isMine || isSubscribed) && (
          <span className="r-tag r-tag--mine r-place-record__relation">
            {isMine ? (isPrivate ? "내 기록 · 비공개" : "내 기록") : "구독 중"}
          </span>
        )}
      </header>

      {record.note?.trim() && <p className="r-place-record__note r-display">&ldquo;{record.note.trim()}&rdquo;</p>}

      {menus.length > 0 && (
        <section className="r-place-record__part">
          <h3>추천 메뉴</h3>
          <ul className="r-place-record__menus">
            {menus.map((menu, index) => {
              const photoIndex = photoIndexOf(photos, menu.photo);
              const label = (
                <span className="r-place-record__menu-text">
                  <span>{menu.name}</span>
                  {menu.price != null && <b>{formatWon(menu.price)}</b>}
                </span>
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
                        <Icon name="fork" />
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

      {tagGroups.length > 0 && (
        <section className="r-place-record__part">
          <h3>이런 곳이에요</h3>
          <TagGroupList groups={tagGroups} />
        </section>
      )}

      <footer className="r-place-record__actions">
        {isMine ? (
          // 기록 수정은 아래 고정 버튼 줄에 있으므로 여기에는 공개 범위 바꾸기와 지우기만 둡니다.
          <>
            <button
              type="button"
              className="r-button r-button--pill r-button--secondary"
              onClick={() => void changeVisibility()}
            >
              {isPrivate ? "공개 추천으로 바꾸기" : "나만 보기로 바꾸기"}
            </button>
            <button type="button" className="r-place-record__delete" onClick={() => void deleteRecord()}>
              기록 지우기
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
            <TasterReportButton
              tasterId={record.tasterId}
              tasterName={record.tasterName}
              placeId={placeId}
              className="r-place-record__report"
            />
          </>
        )}
      </footer>
    </article>
  );
}
