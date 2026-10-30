import type { TouchEvent } from "react";

type SwipeOptions = {
  /** 이 거리(px)보다 길게 밀어야 넘깁니다. */
  threshold?: number;
  /** false면 스와이프를 무시합니다. 넘길 사진이 한 장뿐일 때 씁니다. */
  enabled?: boolean;
  /** 스와이프 직후 이어지는 click을 무시할 수 있도록 요소에 data-swiped="true"를 남깁니다. */
  markSwiped?: boolean;
};

/**
 * 사진 슬라이드의 좌우 스와이프를 처리하는 터치 핸들러입니다.
 * onSwipe는 왼쪽으로 밀면 1(다음), 오른쪽으로 밀면 -1(이전)을 받습니다.
 */
export function swipeHandlers(
  onSwipe: (step: 1 | -1) => void,
  { threshold = 45, enabled = true, markSwiped = false }: SwipeOptions = {},
) {
  return {
    onTouchStart: (event: TouchEvent<HTMLElement>) => {
      event.currentTarget.dataset.touchX = String(event.touches[0]?.clientX ?? 0);
    },
    onTouchEnd: (event: TouchEvent<HTMLElement>) => {
      const start = Number(event.currentTarget.dataset.touchX ?? 0);
      const delta = (event.changedTouches[0]?.clientX ?? start) - start;
      if (!enabled || Math.abs(delta) <= threshold) return;
      if (markSwiped) event.currentTarget.dataset.swiped = "true";
      onSwipe(delta < 0 ? 1 : -1);
    },
  };
}

/** 마지막 다음은 처음으로, 처음 이전은 마지막으로 돌아가는 슬라이드 번호입니다. */
export function wrapIndex(index: number, step: number, total: number): number {
  return (index + step + total) % total;
}
