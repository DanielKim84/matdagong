import { useCallback, useEffect, useRef, useState } from "react";
import { useNotificationDialog } from "../components/NotificationDialog";
import {
  deleteAllNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  markPassiveNotificationsRead,
} from "../services/community";
import type { NotificationFeed, UserNotification } from "../models/community";
import type { Screen } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import type { AppNotice } from "./AppData";

const REFRESH_INTERVAL_MS = 60_000;
const EMPTY_FEED: NotificationFeed = { items: [], unreadCount: 0 };

/** 눌러서 이동할 곳이 없는 알림입니다. 알림함을 열면 바로 읽음으로 표시합니다. */
function isPassiveUnread(item: UserNotification): boolean {
  return !item.readAt && !(item.targetType === "PLACE" && item.targetId) && item.targetType !== "MY_SUBSCRIBERS";
}

/**
 * 알림함 상태와 동작입니다. 1분마다·창으로 돌아올 때 새로 읽고, 알림함 화면을 열면 이동할 곳 없는 알림을 읽음 처리합니다.
 * 동시에 여러 곳에서 새로고침을 요청해도 요청은 하나만 보냅니다.
 */
export function useNotifications(accessToken: string, screen: Screen, notify: (notice: AppNotice) => void) {
  const { confirm } = useNotificationDialog();
  const [feed, setFeed] = useState<NotificationFeed>(EMPTY_FEED);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const pendingRequest = useRef<Promise<NotificationFeed | null> | null>(null);

  const refresh = useCallback(
    async (showLoading = false) => {
      if (pendingRequest.current) return pendingRequest.current;
      if (showLoading) setIsLoading(true);
      const request = (async () => {
        try {
          const nextFeed = await getNotifications(accessToken);
          setFeed(nextFeed);
          setError("");
          return nextFeed;
        } catch (cause) {
          setError(errorMessage(cause, "알림을 불러오지 못했어요."));
          return null;
        } finally {
          setIsLoading(false);
          pendingRequest.current = null;
        }
      })();
      pendingRequest.current = request;
      return request;
    },
    [accessToken],
  );

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_INTERVAL_MS);
    const refreshOnFocus = () => void refresh();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (screen === "notifications") void refresh(feed.items.length === 0);
  }, [screen, feed.items.length, refresh]);

  useEffect(() => {
    if (screen !== "notifications") return;
    const passiveUnreadCount = feed.items.filter(isPassiveUnread).length;
    if (!passiveUnreadCount) return;
    const readAt = new Date().toISOString();
    setFeed((current) => ({
      ...current,
      unreadCount: Math.max(0, current.unreadCount - passiveUnreadCount),
      items: current.items.map((item) => (isPassiveUnread(item) ? { ...item, readAt } : item)),
    }));
    void markPassiveNotificationsRead(accessToken).catch(() => {
      void refresh();
    });
  }, [screen, feed.items, accessToken, refresh]);

  /** 방금 만든 알림을 서버 목록을 다시 읽기 전에 알림함 맨 앞에 넣습니다. */
  const add = useCallback((notification: UserNotification) => {
    setFeed((current) => {
      const isListed = current.items.some((item) => item.notificationId === notification.notificationId);
      return {
        items: [notification, ...current.items.filter((item) => item.notificationId !== notification.notificationId)],
        unreadCount: current.unreadCount + (!isListed && !notification.readAt ? 1 : 0),
      };
    });
    setError("");
  }, []);

  function runUpdate(request: Promise<unknown>, failureTitle: string) {
    void request
      .then(() => refresh())
      .catch((cause: unknown) =>
        notify({ kind: "error", title: failureTitle, message: errorMessage(cause, "잠시 후 다시 시도해 주세요.") }),
      );
  }

  return {
    feed,
    isLoading,
    error,
    refresh,
    add,
    markRead: (item: UserNotification) => {
      if (!item.readAt)
        runUpdate(markNotificationRead(accessToken, item.notificationId), "알림을 읽음 처리하지 못했어요");
    },
    markAllRead: () => runUpdate(markAllNotificationsRead(accessToken), "알림을 읽음 처리하지 못했어요"),
    remove: (id: string) => runUpdate(deleteNotification(accessToken, id), "알림을 삭제하지 못했어요"),
    removeAll: async () => {
      const isAccepted = await confirm({
        title: "알림을 모두 삭제할까요?",
        message: "삭제한 알림은 다시 확인할 수 없어요.",
        tone: "danger",
        confirmLabel: "모두 삭제",
      });
      if (!isAccepted) return;
      try {
        await deleteAllNotifications(accessToken);
        setFeed(EMPTY_FEED);
      } catch (cause) {
        notify({
          kind: "error",
          title: "알림을 모두 삭제하지 못했어요",
          message: errorMessage(cause, "알림을 삭제하지 못했어요."),
        });
      }
    },
  };
}
