import { useRef, type PointerEvent } from "react";

/**
 * 가로로 threshold(px) 이상 밀면 onLeft(왼쪽으로 밂 = 다음)·onRight(오른쪽으로 밂 = 이전)를 부릅니다.
 * 세로로 더 많이 움직인 동작과 짧은 탭은 무시합니다. 돌려준 핸들러를 넘길 요소에 펼쳐 넣습니다.
 * 터치 기기에서 세로 스크롤과 함께 쓰려면 그 요소에 `touch-action: pan-y`를 줍니다
 * (주지 않으면 브라우저가 가로 움직임을 가져가 pointercancel이 납니다).
 */
export function useSwipe({
  onLeft,
  onRight,
  threshold = 60,
  isEnabled = true,
}: {
  onLeft?: () => void;
  onRight?: () => void;
  threshold?: number;
  /** false면 스와이프를 무시합니다. 넘길 사진이 한 장뿐일 때 씁니다. */
  isEnabled?: boolean;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (event: PointerEvent) => {
      start.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from || !isEnabled) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) onLeft?.();
      else onRight?.();
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}
