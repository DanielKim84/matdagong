import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import "../styles/notification-dialog.css";

type NoticeTone = "danger" | "info" | "success" | "warning";
type DialogOptions = {
  title: string;
  message: string;
  detail?: { label: string; value: string };
  tone?: NoticeTone;
  confirmLabel?: string;
};
type DialogRequest = DialogOptions & { mode: "confirm" | "alert" };
type NotificationContextValue = {
  confirm: (options: DialogOptions) => Promise<boolean>;
  alert: (options: DialogOptions) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);
let pageLockCount = 0;
let previousTouchY: number | null = null;
let pageUnlockFrame: number | null = null;

function dialogCanScroll(dialog: HTMLElement, movement: number) {
  if (movement < 0) return dialog.scrollTop > 0;
  if (movement > 0) return dialog.scrollTop + dialog.clientHeight < dialog.scrollHeight - 1;
  return true;
}

function blockBackgroundWheel(event: WheelEvent) {
  if (!event.deltaY) return;
  const target = event.target instanceof Element ? event.target : null;
  const dialog = target?.closest<HTMLElement>(".notification-dialog, .sheet");
  if (dialog && dialogCanScroll(dialog, event.deltaY)) return;
  event.preventDefault();
}

function rememberTouch(event: TouchEvent) {
  previousTouchY = event.touches[0]?.clientY ?? null;
}

function blockBackgroundTouch(event: TouchEvent) {
  const touchY = event.touches[0]?.clientY;
  if (touchY === undefined || previousTouchY === null) return;
  const movement = previousTouchY - touchY;
  previousTouchY = touchY;
  const target = event.target instanceof Element ? event.target : null;
  const dialog = target?.closest<HTMLElement>(".notification-dialog, .sheet");
  if (!dialog || !dialogCanScroll(dialog, movement)) event.preventDefault();
}

function forgetTouch() {
  previousTouchY = null;
}

/** 모달이 열린 동안 배경 문서 스크롤을 잠그고, 모달 안의 스크롤은 허용합니다. */
export function useNotificationPageLock(open: boolean) {
  useLayoutEffect(() => {
    if (!open) return;
    if (pageUnlockFrame !== null) {
      window.cancelAnimationFrame(pageUnlockFrame);
      pageUnlockFrame = null;
    }
    if (pageLockCount === 0) {
      // 모든 모달이 같은 문서 잠금을 공유해 body와 html의 overflow가 충돌하지 않게 합니다.
      document.documentElement.classList.add("notification-page-locked");
      document.addEventListener("wheel", blockBackgroundWheel, { capture: true, passive: false });
      document.addEventListener("touchstart", rememberTouch, { capture: true, passive: true });
      document.addEventListener("touchmove", blockBackgroundTouch, { capture: true, passive: false });
      document.addEventListener("touchend", forgetTouch, true);
      document.addEventListener("touchcancel", forgetTouch, true);
    }
    pageLockCount += 1;
    return () => {
      pageLockCount = Math.max(0, pageLockCount - 1);
      if (pageLockCount !== 0) return;
      // 연속 알림이 교체되는 프레임 사이에 잠금이 잠깐 풀려 스크롤바가 깜빡이지 않게 합니다.
      pageUnlockFrame = window.requestAnimationFrame(() => {
        pageUnlockFrame = null;
        if (pageLockCount !== 0) return;
        document.documentElement.classList.remove("notification-page-locked");
        document.removeEventListener("wheel", blockBackgroundWheel, true);
        document.removeEventListener("touchstart", rememberTouch, true);
        document.removeEventListener("touchmove", blockBackgroundTouch, true);
        document.removeEventListener("touchend", forgetTouch, true);
        document.removeEventListener("touchcancel", forgetTouch, true);
        previousTouchY = null;
      });
    };
  }, [open]);
}

/** 확인과 안내를 한 가지 다이얼로그 디자인으로 제공해 브라우저 기본 팝업을 피합니다. */
export function NotificationDialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const resolveRequest = useRef<((accepted: boolean) => void) | null>(null);
  const cancelButton = useRef<HTMLButtonElement>(null);
  useNotificationPageLock(!!request);

  const finish = useCallback((accepted: boolean) => {
    const resolve = resolveRequest.current;
    resolveRequest.current = null;
    setRequest(null);
    resolve?.(accepted);
  }, []);

  const confirm = useCallback((options: DialogOptions) => new Promise<boolean>((resolve) => {
    // 한 번에 하나의 확인창만 열어 사용자 응답이 다른 작업에 섞이지 않게 합니다.
    if (resolveRequest.current) {
      resolve(false);
      return;
    }
    resolveRequest.current = resolve;
    setRequest({ ...options, mode: "confirm" });
  }), []);

  const alert = useCallback((options: DialogOptions) => new Promise<void>((resolve) => {
    if (resolveRequest.current) {
      resolve();
      return;
    }
    resolveRequest.current = () => resolve();
    setRequest({ ...options, mode: "alert" });
  }), []);

  useEffect(() => {
    if (!request) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButton.current?.focus({ preventScroll: true });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") finish(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [request, finish]);

  const icon = request?.tone === "success" ? "check"
    : request?.tone === "info" ? "message"
      : request?.tone === "warning" ? "sparkle" : "close";

  return (
    <NotificationContext.Provider value={{ confirm, alert }}>
      {children}
      {request && createPortal(
        <div className="notification-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) finish(false);
        }}>
          <section className={`notification-dialog notification-dialog--${request.tone ?? "danger"}`}
            role={request.mode === "confirm" ? "alertdialog" : "dialog"}
            aria-modal="true" aria-labelledby="notification-dialog-title"
            aria-describedby={request.detail ? "notification-dialog-message notification-dialog-detail" : "notification-dialog-message"}>
            <span className="notification-dialog-icon"><Icon name={icon} /></span>
            <h2 id="notification-dialog-title">{request.title}</h2>
            <p id="notification-dialog-message">{request.message}</p>
            {request.detail && <div className="notification-dialog-detail" id="notification-dialog-detail">
              <span>{request.detail.label}</span><b>{request.detail.value}</b>
            </div>}
            <div className={`notification-dialog-actions${request.mode === "alert" ? " is-alert" : ""}`}>
              {request.mode === "confirm" && (
                <button ref={cancelButton} type="button" className="notification-dialog-cancel" onClick={() => finish(false)}>취소</button>
              )}
              <button type="button" autoFocus={request.mode === "alert"}
                className="notification-dialog-accept" onClick={() => finish(true)}>
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
