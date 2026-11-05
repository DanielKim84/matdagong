import { useMemo } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon, { type IconName } from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import PlaceThumb from "../../components/PlaceThumb";
import { EmptyState, SectionHead, Skeleton, TopBar } from "../../components/ui";
import type { UserNotification } from "../../models/community";
import { placePhoto, type Place } from "../../models/place";
import { DAY_MS, formatRelativeTime, parseTime } from "../../utils/format";

type NotificationGroup = { label: string; items: UserNotification[] };

/** 오늘을 빼고 이만큼 앞의 날까지를 "이번 주"로 묶습니다. */
const THIS_WEEK_PAST_DAYS = 6;

/** 오늘 / 이번 주 / 이전 으로 묶습니다. 서버가 준 순서는 그대로 둡니다. */
function groupByDate(items: UserNotification[]): NotificationGroup[] {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const today = startOfToday.getTime();
  const groups: NotificationGroup[] = [
    { label: "오늘", items: [] },
    { label: "이번 주", items: [] },
    { label: "이전", items: [] },
  ];
  for (const item of items) {
    const time = parseTime(item.createdAt);
    if (time === null || time < today - THIS_WEEK_PAST_DAYS * DAY_MS) groups[2].items.push(item);
    else if (time >= today) groups[0].items.push(item);
    else groups[1].items.push(item);
  }
  return groups.filter((group) => group.items.length > 0);
}

/** 알림 종류별 아이콘과 바탕색 */
function describeKind(item: UserNotification): { icon: IconName; tone: "brand" | "amber" } {
  if (item.notificationType === "NEW_SUBSCRIBER") return { icon: "user", tone: "brand" };
  if (item.notificationType === "SYSTEM_NOTICE") return { icon: "bell", tone: "amber" };
  if (item.notificationType === "PLACE_RECORD_CREATED") return { icon: "pin", tone: "brand" };
  return { icon: "fork", tone: "brand" };
}

/** 알림을 누르면 갈 곳: 장소 알림은 맛집 상세, 구독자 알림은 구독 관리의 나를 구독 탭. 갈 곳이 없으면 null입니다. */
function resolveTarget(item: UserNotification): (() => void) | null {
  if (item.targetType === "PLACE" && item.targetId) {
    const id = item.targetId;
    return () => go("place", id);
  }
  if (item.targetType === "MY_SUBSCRIBERS") return () => go("subscriptions", "incoming");
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
    for (const place of [...app.places, ...app.myRecords, ...app.privatePlaces])
      if (!map.has(place.id)) map.set(place.id, place);
    return map;
  }, [app.places, app.myRecords, app.privatePlaces]);

  async function remove(item: UserNotification) {
    const isAccepted = await confirm({
      title: "알림을 삭제할까요?",
      message: "삭제한 알림은 알림 목록에서 사라져요.",
      tone: "danger",
      confirmLabel: "삭제하기",
    });
    if (isAccepted) actions.deleteNotification(item.notificationId);
  }

  return (
    <main className="r-screen r-feed-noti">
      <TopBar
        title="알림"
        fallback="feed"
        right={
          items.length > 0 ? (
            <button
              type="button"
              className="r-text-button"
              onClick={actions.markAllNotificationsRead}
              disabled={unreadCount === 0}
            >
              모두 읽음
            </button>
          ) : undefined
        }
      />

      <div className="r-feed-noti__body">
        {notificationLoading ? (
          <Skeleton count={3} label="알림을 불러오고 있어요." className="r-feed-noti__skeletons" />
        ) : notificationError ? (
          <EmptyState
            icon="bell"
            tone="error"
            title="알림을 불러오지 못했어요"
            message={notificationError}
            action={{ label: "다시 불러오기", onClick: () => void actions.refreshNotifications(true) }}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon="bell"
            title="새로운 알림이 없어요"
            message={
              <>
                구독한 맛객의 새 기록과 구독 소식을
                <br />
                이곳에서 알려 드릴게요.
              </>
            }
          />
        ) : (
          <>
            {groups.map((group) => (
              <section className="r-feed-noti__group" key={group.label} aria-label={group.label}>
                <SectionHead title={group.label} className="r-feed-noti__label" />
                <ul className="r-card r-feed-noti__list">
                  {group.items.map((item) => {
                    const kind = describeKind(item);
                    const openTarget = resolveTarget(item);
                    const isUnread = !item.readAt;
                    const place =
                      item.targetType === "PLACE" && item.targetId ? placeById.get(item.targetId) : undefined;
                    const photo = place && placePhoto(place);
                    return (
                      <li
                        className={`r-feed-noti__item${isUnread ? " is-unread" : " is-read"}`}
                        key={item.notificationId}
                      >
                        <button
                          type="button"
                          className="r-feed-noti__open"
                          aria-label={`${isUnread ? "읽지 않음, " : ""}${item.title}. ${item.message}${openTarget ? ", 내용 보기" : ""}`}
                          onClick={() => {
                            actions.markNotificationRead(item);
                            openTarget?.();
                          }}
                        >
                          <span className={`r-feed-noti__icon is-${kind.tone}`}>
                            <Icon name={kind.icon} />
                          </span>
                          <span className="r-feed-noti__copy">
                            <b>{item.title}</b>
                            {item.message && <span>{item.message}</span>}
                            <time dateTime={item.createdAt}>{formatRelativeTime(item.createdAt)}</time>
                          </span>
                          {place && photo && <PlaceThumb place={place} photo={photo} className="r-feed-noti__thumb" />}
                          {isUnread && <i className="r-feed-noti__dot" aria-hidden="true" />}
                        </button>
                        <button
                          type="button"
                          className="r-icon-button r-feed-noti__delete"
                          aria-label={`${item.title} 알림 삭제`}
                          onClick={() => void remove(item)}
                        >
                          <Icon name="close" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {/* 확인 창은 actions.deleteAllNotifications가 띄웁니다. */}
            <button
              type="button"
              className="r-text-button r-feed-noti__delete-all"
              onClick={() => void actions.deleteAllNotifications()}
            >
              알림 모두 삭제
            </button>
          </>
        )}
      </div>
    </main>
  );
}
