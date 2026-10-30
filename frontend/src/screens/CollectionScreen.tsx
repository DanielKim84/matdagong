import { useState } from "react";
import type { Place, Taster } from "../models/place";
import { go } from "../app/navigation";
import { ScreenHeader } from "../components/AppChrome";
import { Avatar } from "../components/BrandAssets";
import PlaceTile from "../components/PlaceTile";
import Icon from "../components/Icon";
import { useNotificationDialog } from "../components/NotificationDialog";
import type { UserNotification } from "../services/community";

export function CollectionScreen({
  title,
  places,
  liked,
  onLike,
  photoFor,
}: {
  title: string;
  places: Place[];
  liked: string[];
  onLike: (id: string) => void;
  photoFor: (id: string) => string | undefined;
}) {
  return (
    <>
      <ScreenHeader title={title} fallback="my" />
      <main className="collection-content">
        <section className="collection-overview">
          <span><Icon name={title === "내가 등록한 맛집" ? "fork" : title === "최근 본 맛집" ? "clock" : "heart"} /></span>
          <div><b>{title}</b><small>{title === "내가 등록한 맛집" ? "내가 직접 다녀와 추천 이유를 남긴 곳" : title === "최근 본 맛집" ? "최근 살펴본 맛집을 다시 찾아볼 수 있어요" : "마음에 들어 내 맛집에 저장한 곳"}</small></div>
          <strong>{places.length}<small>곳</small></strong>
        </section>
        {places.length ? (
          <div className="tile-grid">
            {places.map((place) => (
              <PlaceTile
                key={place.id}
                place={place}
                liked={liked.includes(place.id)}
                onLike={() => onLike(place.id)}
                photo={photoFor(place.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state collection-empty">
            <Icon name="book" />
            <h2>차곡차곡, 나의 맛집 기록</h2>
            <p>아직 모아둔 기록이 없어요.</p>
            <button
              className="primary-button"
              onClick={() =>
                go(title === "내가 등록한 맛집" ? "register" : "home")
              }
            >
              {title === "내가 등록한 맛집"
                ? "첫 맛집 등록하기"
                : "맛집 둘러보기"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export function SubscriptionsScreen({
  subscriptions,
  onCancel,
}: {
  subscriptions: {
    subscriptionId: string;
    taster: Taster;
    subscriptionType: "FREE" | "PAID";
    termMonths: number | null;
    endAt: string | null;
  }[];
  onCancel: (subscriptionId: string) => Promise<void>;
}) {
  const { confirm } = useNotificationDialog();
  const [cancelingId, setCancelingId] = useState("");
  return (
    <>
      <ScreenHeader title="내 구독 맛객" fallback="my" />
      <main className="subscription-list">
        <section className="collection-overview">
          <span><Icon name="user" /></span>
          <div><b>내가 구독하는 맛객</b><small>구독한 맛객의 새 맛집 기록을 모아봐요</small></div>
          <strong>{subscriptions.length}<small>명</small></strong>
        </section>
        {subscriptions.length ? (
          <>
            {subscriptions.map(({ subscriptionId, taster, subscriptionType, termMonths, endAt }) => (
              <article key={taster.tasterId}>
                <button
                  className="subscription-profile"
                  onClick={() => go("profile", taster.tasterId)}
                >
                  <Avatar src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
                  <span>
                    <b>{taster.tasterName}</b>
                    <small>{taster.tag}</small>
                    <small className="subscription-plan-label">{subscriptionType === "FREE"
                      ? "기간 제한 없음"
                      : `${termMonths ?? 0}개월 이용${endAt ? ` · ${new Date(endAt).toLocaleDateString("ko-KR")}까지` : ""}`}</small>
                  </span>
                </button>
                <span className={`subscription-type-chip ${subscriptionType === "FREE" ? "is-free" : "is-paid"}`}>{subscriptionType === "FREE" ? "무료" : "유료"}</span>
                <button className="subscription-cancel" type="button" disabled={cancelingId === subscriptionId} onClick={async () => {
                  const accepted = await confirm({
                    title: "구독을 취소할까요?",
                    message: `${taster.tasterName} 맛객의 새 기록 알림과 구독 목록 표시가 중단돼요.`,
                    tone: "danger",
                    confirmLabel: "구독 취소",
                  });
                  if (!accepted) return;
                  setCancelingId(subscriptionId);
                  try { await onCancel(subscriptionId); }
                  finally { setCancelingId(""); }
                }}>{cancelingId === subscriptionId ? "구독 취소 중" : "구독 취소"}</button>
              </article>
            ))}
          </>
        ) : (
          <div className="empty-state collection-empty">
            <Icon name="pin" />
            <h2>아직 구독한 맛객이 없어요</h2>
            <p>내 취향과 잘 맞는 맛객을 찾아 구독해 보세요.</p>
            <button className="primary-button" onClick={() => go("taster-recommendations")}>
              취향 맛객 추천 보기
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export function NotificationsScreen({
  items,
  unreadCount,
  loading,
  error,
  onMarkAllRead,
  onRead,
  onDelete,
  onDeleteAll,
  onRetry,
}: {
  items: UserNotification[];
  unreadCount: number;
  loading: boolean;
  error: string;
  onMarkAllRead: () => void;
  onRead: (notification: UserNotification) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onRetry: () => void;
}) {
  const { confirm } = useNotificationDialog();
  return (
    <>
      <ScreenHeader title="알림" fallback="home" />
      <main className="notification-list">
        {items.length > 0 && <div className="notification-toolbar">
          <button type="button" className="notification-mark-all" onClick={onMarkAllRead} disabled={unreadCount === 0}>모두 읽음</button>
          <button type="button" className="notification-delete-all" onClick={onDeleteAll}>모두 삭제</button>
        </div>}
        {loading ? <p className="notification-state">알림을 불러오고 있어요.</p> : error ? (
          <div className="notification-state"><p>{error}</p><button type="button" onClick={onRetry}>다시 불러오기</button></div>
        ) : items.length ? items.map((item) => {
          const hasAction = (item.targetType === "PLACE" && !!item.targetId) || item.targetType === "MY_SUBSCRIBERS";
          return (
          <article className={`notification-entry${item.readAt ? " is-read" : " is-unread"}`} key={item.notificationId}>
            <button type="button" className="notification-entry-open" aria-label={`${item.title}${hasAction ? ", 내용 보기" : ""}`} onClick={() => {
                onRead(item);
                if (item.targetType === "PLACE" && item.targetId) go("place", item.targetId);
                else if (item.targetType === "MY_SUBSCRIBERS") go("my");
              }}>
                <span className="notification-entry-icon"><Icon name={item.notificationType === "NEW_SUBSCRIBER" ? "user" : "fork"} /></span>
                <span className="notification-entry-copy">
                  <b>{item.title}</b>
                  <p>{item.message}</p>
                  <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</time>
                  {hasAction && <span className="notification-action-cue">눌러서 내용 보기 <span aria-hidden="true">›</span></span>}
                </span>
                {!item.readAt && <i className="notification-unread-dot" aria-label="읽지 않음" />}
            </button>
            <button type="button" className="notification-entry-delete" aria-label="알림 삭제" onClick={async () => {
              const accepted = await confirm({
                title: "알림을 삭제할까요?",
                message: "삭제한 알림은 알림 목록에서 사라져요.",
                tone: "danger",
                confirmLabel: "삭제하기",
              });
              if (accepted) onDelete(item.notificationId);
            }}><Icon name="close" /></button>
          </article>
          );
        }) : (
          <div className="empty-state notification-empty">
            <Icon name="bell" />
            <h2>새로운 알림이 없어요</h2>
            <p>구독과 맛집 기록 소식을 이곳에서 확인할 수 있어요.</p>
          </div>
        )}
      </main>
    </>
  );
}
