import { useRef, type PointerEvent } from "react";

/** 가로로 60px 이상 밀면 왼쪽·오른쪽 동작을 부릅니다. 세로 스크롤과 짧은 탭은 무시합니다. */
export function useSwipe(onLeft: () => void, onRight?: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null);
  return {
    onPointerDown: (event: PointerEvent) => {
      start.current = { x: event.clientX, y: event.clientY };
    },
    onPointerUp: (event: PointerEvent) => {
      const from = start.current;
      start.current = null;
      if (!from) return;
      const dx = event.clientX - from.x;
      const dy = event.clientY - from.y;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy)) return;
      if (dx < 0) onLeft();
      else onRight?.();
    },
    onPointerCancel: () => {
      start.current = null;
    },
  };
}
