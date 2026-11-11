/** 앱 공통 확인창·안내창입니다. 열린 동안 배경 스크롤은 hooks/usePageScrollLock으로 잠급니다. */
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePageScrollLock } from "../hooks/usePageScrollLock";
import Icon from "./Icon";

type NoticeTone = "danger" | "info" | "success" | "warning";
type DialogOptions = {
  title: string;
  message: string;
  detail?: { label: string; value: string };
  tone?: NoticeTone;
  confirmLabel?: string;
};
type DialogMode = "confirm" | "alert";
type DialogRequest = DialogOptions & { mode: DialogMode };
type QueuedAlert = { options: DialogOptions; resolve: () => void };
type NotificationContextValue = {
  confirm: (options: DialogOptions) => Promise<boolean>;
  alert: (options: DialogOptions) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
/** 확인과 안내를 한 가지 다이얼로그 디자인으로 제공해 브라우저 기본 팝업을 피합니다. */
export function NotificationDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const resolveRequest = useRef<((isAccepted: boolean) => void) | null>(null);
  const activeMode = useRef<DialogMode | null>(null);
  const queuedAlerts = useRef<QueuedAlert[]>([]);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const acceptButton = useRef<HTMLButtonElement>(null);
  usePageScrollLock(!!request);

  const open = useCallback((options: DialogOptions, mode: DialogMode, resolve: (isAccepted: boolean) => void) => {
    resolveRequest.current = resolve;
    activeMode.current = mode;
    setRequest({ ...options, mode });
  }, []);

  const finish = useCallback(
    (isAccepted: boolean) => {
      const resolve = resolveRequest.current;
      resolveRequest.current = null;
      activeMode.current = null;
      const next = queuedAlerts.current.shift();
      if (next) open(next.options, "alert", () => next.resolve());
      else setRequest(null);
      resolve?.(isAccepted);
    },
    [open],
  );

  const confirm = useCallback(
    (options: DialogOptions) =>
      new Promise<boolean>((resolve) => {
        // 한 번에 하나의 확인창만 열어 사용자 응답이 다른 작업에 섞이지 않게 합니다.
        if (resolveRequest.current) {
          resolve(false);
          return;
        }
        open(options, "confirm", resolve);
      }),
    [open],
  );

  const alert = useCallback(
    (options: DialogOptions) =>
      new Promise<void>((resolve) => {
        // 확인창이 열려 있으면 답을 받은 뒤 보여 주고, 안내창끼리는 새 안내가 이전 안내를 대신합니다.
        if (activeMode.current === "confirm") {
          queuedAlerts.current.push({ options, resolve });
          return;
        }
        const previous = resolveRequest.current;
        open(options, "alert", () => resolve());
        previous?.(true);
      }),
    [open],
  );

  useEffect(() => {
    if (!request) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // 확인창은 실수로 진행하지 않도록 취소에, 안내창은 하나뿐인 확인 버튼에 포커스를 둡니다.
    (cancelButton.current ?? acceptButton.current)?.focus({ preventScroll: true });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [request, finish]);

  const icon =
    request?.tone === "success"
      ? "check"
      : request?.tone === "info"
        ? "message"
        : request?.tone === "warning"
          ? "sparkle"
          : "close";

  return (
    <NotificationContext.Provider value={{ confirm, alert }}>
      {children}
      {request &&
        createPortal(
          <div
            className="r-dialog-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) finish(false);
            }}
          >
            <section
              className={`r-dialog r-dialog--${request.tone ?? "danger"}`}
              role={request.mode === "confirm" ? "alertdialog" : "dialog"}
              aria-modal="true"
              aria-labelledby="notification-dialog-title"
              aria-describedby={
                request.detail
                  ? "notification-dialog-message notification-dialog-detail"
                  : "notification-dialog-message"
              }
            >
              <span className="r-dialog__icon">
                <Icon name={icon} />
              </span>
              <h2 id="notification-dialog-title" className="r-dialog__title">
                {request.title}
              </h2>
              <p id="notification-dialog-message" className="r-dialog__message">
                {request.message}
              </p>
              {request.detail && (
                <div className="r-dialog__detail" id="notification-dialog-detail">
                  <span>{request.detail.label}</span>
                  <b>{request.detail.value}</b>
                </div>
              )}
              <div className={`r-dialog__actions${request.mode === "alert" ? " is-alert" : ""}`}>
                {request.mode === "confirm" && (
                  <button ref={cancelButton} type="button" className="r-dialog__cancel" onClick={() => finish(false)}>
                    취소
                  </button>
                )}
                <button type="button" ref={acceptButton} className="r-dialog__accept" onClick={() => finish(true)}>
                  {request.confirmLabel ?? (request.mode === "confirm" ? "확인" : "확인했어요")}
                </button>
              </div>
            </section>
          </div>,
          document.body,
        )}
    </NotificationContext.Provider>
  );
}

/** App과 하위 화면에서 같은 확인·안내 대화상자를 호출합니다. */
export function useNotificationDialog() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error("NotificationDialogProvider 안에서 사용해야 합니다.");
  return context;
}
