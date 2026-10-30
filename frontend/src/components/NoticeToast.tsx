import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Icon from "./Icon";
import { useNotificationPageLock } from "./NotificationDialog";
import "../styles/notification-dialog.css";

export type NoticeKind = "info" | "success" | "error";

type Props = {
  kind: NoticeKind;
  title: string;
  message: string;
  onDismiss: () => void;
};

/** 앱의 안내·성공·오류 알림도 확인창과 같은 중앙형 디자인으로 보여줍니다. */
export default function NoticeToast({ kind, title, message, onDismiss }: Props) {
  const acknowledgeButton = useRef<HTMLButtonElement>(null);
  useNotificationPageLock(true);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    acknowledgeButton.current?.focus({ preventScroll: true });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus({ preventScroll: true });
    };
  }, [onDismiss]);

  const tone = kind === "error" ? "danger" : kind;
  const icon = kind === "success" ? "check" : kind === "error" ? "close" : "message";

  return createPortal(
    <div className="notification-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onDismiss();
    }}>
      <section className={`notification-dialog notification-dialog--${tone}`}
        role={kind === "error" ? "alertdialog" : "dialog"} aria-modal="true"
        aria-labelledby="app-notice-title" aria-describedby="app-notice-message">
        <span className="notification-dialog-icon"><Icon name={icon} /></span>
        <h2 id="app-notice-title">{title}</h2>
        <p id="app-notice-message">{message}</p>
        <div className="notification-dialog-actions is-alert">
          <button ref={acknowledgeButton} type="button" className="notification-dialog-accept" onClick={onDismiss}>확인했어요</button>
        </div>
      </section>
    </div>,
    document.body,
  );
}
