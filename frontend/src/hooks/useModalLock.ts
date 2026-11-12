import { useEffect, useRef, type RefObject } from "react";
import { usePageScrollLock } from "./usePageScrollLock";

/**
 * 전체 화면 창(사진 보기, 스토리 등)이 열려 있는 동안 뒤 화면 스크롤을 잠그고(시트·확인창과 같은 usePageScrollLock), Esc로 닫고,
 * 닫히면 열기 전에 포커스가 있던 요소로 돌려보냅니다.
 * onClose·onKeyDown은 ref로 최신 값을 쓰므로 부모가 매번 새 함수를 넘겨도 잠금이 다시 걸리지 않습니다.
 */
export function useModalLock(
  onClose: () => void,
  {
    initialFocus,
    onKeyDown,
  }: {
    /** 열릴 때 포커스를 줄 요소(보통 닫기 버튼). 없으면 포커스를 옮기지 않습니다. */
    initialFocus?: RefObject<HTMLElement | null>;
    /** Esc 말고 더 받을 키(좌우 화살표 등) */
    onKeyDown?: (event: KeyboardEvent) => void;
  } = {},
): void {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const keyDownRef = useRef(onKeyDown);
  keyDownRef.current = onKeyDown;
  usePageScrollLock(true);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    initialFocus?.current?.focus({ preventScroll: true });
    function closeOrForwardKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      else keyDownRef.current?.(event);
    }
    document.addEventListener("keydown", closeOrForwardKey);
    return () => {
      document.removeEventListener("keydown", closeOrForwardKey);
      previous?.focus({ preventScroll: true });
    };
  }, [initialFocus]);
}
