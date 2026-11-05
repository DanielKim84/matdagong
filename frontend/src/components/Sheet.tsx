import { useEffect, useRef, type ReactNode } from "react";
import { usePageScrollLock } from "../hooks/usePageScrollLock";
import Icon from "./Icon";

const FOCUSABLE = "button,input,textarea,select,a[href]";

/**
 * 아래에서 올라오는 공통 시트입니다. 열려 있는 동안 뒤 화면 스크롤을 잠그고, Esc로 닫고, Tab 포커스를 시트 안에 가두며,
 * 닫히면 열기 전에 포커스가 있던 요소로 돌려보냅니다.
 * - variant="plain": 공통 바탕·손잡이·제목 줄 모양 없이 열고 닫는 동작만 씁니다. 모양은 backdropClassName·className으로 줍니다.
 * - header: 기본 제목 줄(제목 + 닫기 버튼) 대신 그릴 머리 부분. 이때 title은 화면 읽기용 이름으로만 씁니다.
 */
export default function Sheet({
  title,
  onClose,
  children,
  className = "",
  variant = "default",
  backdropClassName = "",
  header,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  variant?: "default" | "plain";
  backdropClassName?: string;
  header?: ReactNode;
}) {
  const panel = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  usePageScrollLock(true);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panel.current?.focus({ preventScroll: true });
    function trapFocus(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab") return;
      const items = panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items?.length) {
        event.preventDefault();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panel.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === panel.current)) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      previous?.focus({ preventScroll: true });
    };
  }, []);
  const isPlain = variant === "plain";
  return (
    <div className={`${isPlain ? "" : "r-sheet-backdrop"} ${backdropClassName}`} onClick={onClose}>
      <section
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        // "sheet"는 모양이 아니라 NotificationDialog의 배경 스크롤 잠금이 시트 안 스크롤을 허용할 때 찾는 표시입니다.
        className={`sheet ${isPlain ? "" : "r-sheet"} ${className}`}
        onClick={(event) => event.stopPropagation()}
      >
        {header ?? (
          <header className="r-sheet__head">
            <h2 className="r-sheet__title">{title}</h2>
            <button type="button" className="r-icon-button r-sheet__close" onClick={onClose} aria-label="닫기">
              <Icon name="close" />
            </button>
          </header>
        )}
        {children}
      </section>
    </div>
  );
}
