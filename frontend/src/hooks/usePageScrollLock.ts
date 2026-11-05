import { useLayoutEffect } from "react";

/**
 * 시트·확인창·전체 화면 창(사진 보기, 스토리)이 열린 동안 뒤 문서 스크롤을 잠급니다. 앱의 모든 창이 이 한 가지 방식을 써서
 * 창이 겹쳐 열리고 닫혀도(잠금 수를 세어) 먼저 닫힌 창이 잠금을 풀어 버리지 않습니다.
 * html에 is-page-locked(app.css)를 붙이고, iOS처럼 overflow만으로 안 막히는 휠·터치 스크롤은 창 밖에서만 막습니다.
 */
// 배경 스크롤을 잠근 동안에도 안쪽 스크롤은 허용할 창입니다(확인창과 Sheet의 "sheet" 표시).
const SCROLLABLE_MODAL_SELECTOR = ".r-dialog, .sheet";
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
  const dialog = target?.closest<HTMLElement>(SCROLLABLE_MODAL_SELECTOR);
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
  const dialog = target?.closest<HTMLElement>(SCROLLABLE_MODAL_SELECTOR);
  if (!dialog || !dialogCanScroll(dialog, movement)) event.preventDefault();
}

function forgetTouch() {
  previousTouchY = null;
}

/** isLocked인 동안 배경 문서 스크롤을 잠그고, 창 안의 스크롤은 허용합니다. */
export function usePageScrollLock(isLocked: boolean) {
  useLayoutEffect(() => {
    if (!isLocked) return;
    if (pageUnlockFrame !== null) {
      window.cancelAnimationFrame(pageUnlockFrame);
      pageUnlockFrame = null;
    }
    if (pageLockCount === 0) {
      // 모든 모달이 같은 문서 잠금을 공유해 body와 html의 overflow가 충돌하지 않게 합니다.
      document.documentElement.classList.add("is-page-locked");
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
        document.documentElement.classList.remove("is-page-locked");
        document.removeEventListener("wheel", blockBackgroundWheel, true);
        document.removeEventListener("touchstart", rememberTouch, true);
        document.removeEventListener("touchmove", blockBackgroundTouch, true);
        document.removeEventListener("touchend", forgetTouch, true);
        document.removeEventListener("touchcancel", forgetTouch, true);
        previousTouchY = null;
      });
    };
  }, [isLocked]);
}
