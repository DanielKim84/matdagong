import { useMemo } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon, { type IconName } from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import { TopBar, relativeTime } from "../../components/ui";
import type { Place } from "../../models/place";
import type { UserNotification } from "../../services/community";

type Group = { label: string; items: UserNotification[] };

const DAY_MS = 24 * 60 * 60 * 1000;

/** 오늘 / 이번 주 / 이전 으로 묶습니다. 서버가 준 순서는 그대로 둡니다. */
function groupByDate(items: UserNotification[]): Group[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const groups: Group[] = [
    { label: "오늘", items: [] },
    { label: "이번 주", items: [] },
    { label: "이전", items: [] },
  ];
  for (const item of items) {
    const time = new Date(item.createdAt).getTime();
    if (Number.isNaN(time) || time < today - 6 * DAY_MS) groups[2].items.push(item);
    else if (time >= today) groups[0].items.push(item);
    else groups[1].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

/** 알림 종류별 아이콘과 바탕색 */
function kindOf(item: UserNotification): { icon: IconName; tone: "brand" | "amber" } {
  if (item.notificationType === "NEW_SUBSCRIBER") return { icon: "user", tone: "brand" };
  if (item.notificationType === "SYSTEM_NOTICE") return { icon: "bell", tone: "amber" };
  if (item.notificationType === "PLACE_RECORD_CREATED") return { icon: "pin", tone: "brand" };
  return { icon: "fork", tone: "brand" };
}

/** 예전 알림 화면과 같은 이동 규칙: 장소 알림은 맛집 상세, 구독자 알림은 나 탭. */
function targetOf(item: UserNotification): (() => void) | null {
  if (item.targetType === "PLACE" && item.targetId) {
    const id = item.targetId;
    return () => go("place", id);
  }
  if (item.targetType === "MY_SUBSCRIBERS") return () => go("my");
  return null;
}

/** 알림(#notifications). 상단 종 아이콘에서 엽니다. */
export default function NotificationsScreen() {
  const app = useAppData();
  const { notificationFeed, notificationLoading, notificationError, actions } = app;
  const { items, unreadCount } = notificationFeed;
  const { confirm } = useNotificationDialog();
  const groups = useMemo(() => groupByDate(items), [items]);

  // 장소 알림에는 그 장소의 기록 사진을 작게 붙입니다.
  const placeById = useMemo(() => {
    const map = new Map<string, Place>();
    for (const place of [...app.places, ...app.myRecords, ...app.privatePlaces]) if (!map.has(place.id)) map.set(place.id, place);
    return map;
  }, [app.places, app.myRecords, app.privatePlaces]);

  async function remove(item: UserNotification) {
    const accepted = await confirm({
      title: "알림을 삭제할까요?",
      message: "삭제한 알림은 알림 목록에서 사라져요.",
      tone: "danger",
      confirmLabel: "삭제하기",
    });
    if (accepted) actions.deleteNotification(item.notificationId);
  }

  return (
    <main className="r-screen r-feed-noti">
      <TopBar
        title="알림"
        fallback="feed"
        right={items.length > 0 ? (
          <button type="button" className="r-feed-text-button" onClick={actions.markAllNotificationsRead} disabled={unreadCount === 0}>
            모두 읽음
          </button>
        ) : undefined}
      />

      <div className="r-feed-noti__body">
        {notificationLoading ? (
          <div className="r-feed-noti__group" role="status" aria-label="알림을 불러오고 있어요">
            {[0, 1, 2].map((index) => <div className="r-feed-noti__skeleton" key={index} aria-hidden="true" />)}
          </div>
        ) : notificationError ? (
          <div className="r-empty">
            <span className="r-badge-icon"><Icon name="bell" /></span>
            <b>알림을 불러오지 못했어요</b>
            <p>{notificationError}</p>
            <button type="button" className="r-button r-button--secondary r-button--pill" onClick={() => void actions.refreshNotifications(true)}>
              다시 불러오기
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="r-empty">
            <span className="r-badge-icon"><Icon name="bell" /></span>
            <b>새로운 알림이 없어요</b>
            <p>구독한 맛객의 새 기록과 구독 소식을<br />이곳에서 알려 드릴게요.</p>
          </div>
        ) : (
          <>
            {groups.map((group) => (
              <section className="r-feed-noti__group" key={group.label} aria-label={group.label}>
                <h2 className="r-feed-noti__label">{group.label}</h2>
                <ul className="r-card r-feed-noti__list">
                  {group.items.map((item) => {
                    const kind = kindOf(item);
                    const open = targetOf(item);
                    const unread = !item.readAt;
                    const place = item.targetType === "PLACE" && item.targetId ? placeById.get(item.targetId) : undefined;
                    const photo = place?.tasters.find((taster) => taster.photos?.length)?.photos?.[0];
                    return (
                      <li className={`r-feed-noti__item${unread ? " is-unread" : " is-read"}`} key={item.notificationId}>
                        <button
                          type="button"
                          className="r-feed-noti__open"
                          aria-label={`${unread ? "읽지 않음, " : ""}${item.title}. ${item.message}${open ? ", 내용 보기" : ""}`}
                          onClick={() => {
                            actions.markNotificationRead(item);
                            open?.();
                          }}
                        >
                          <span className={`r-feed-noti__icon is-${kind.tone}`}><Icon name={kind.icon} /></span>
                          <span className="r-feed-noti__copy">
                            <b>{item.title}</b>
                            {item.message && <span>{item.message}</span>}
                            <time dateTime={item.createdAt}>{relativeTime(item.createdAt)}</time>
                          </span>
                          {photo && <img className="r-feed-noti__thumb" src={photo} alt="" loading="lazy" decoding="async" />}
                          {unread && <i className="r-feed-noti__dot" aria-hidden="true" />}
                        </button>
                        <button type="button" className="r-icon-button r-feed-noti__delete" aria-label={`${item.title} 알림 삭제`} onClick={() => void remove(item)}>
                          <Icon name="close" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            <button type="button" className="r-feed-text-button r-feed-noti__delete-all" onClick={() => void actions.deleteAllNotifications()}>
              알림 모두 삭제
            </button>
          </>
        )}
      </div>
    </main>
  );
}
