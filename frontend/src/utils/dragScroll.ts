/**
 * PC에서 마우스로 가로 목록(카드 넘기기, 칩 줄 등)을 끌어 넘길 수 있게 합니다.
 * 터치·트랙패드는 브라우저 기본 스크롤을 그대로 쓰고, 마우스 왼쪽 버튼으로 끌 때만 동작합니다.
 * - 카드처럼 자석 정렬(scroll-snap)이 있는 목록: 조금만 끌어도 놓는 순간 다음(이전) 카드로 부드럽게 넘어갑니다.
 * - 칩 줄처럼 자석 정렬이 없는 목록: 놓은 뒤에도 끌던 속도로 조금 더 미끄러지다 멈춥니다.
 * 끌어 넘긴 직후의 클릭은 막아서 카드를 넘기다가 상세로 이동하지 않게 합니다.
 */
const DRAG_THRESHOLD = 6;
/** 이만큼 끌거나(px) 이 속도 이상으로 튕기면(px/ms) 다음 카드로 넘깁니다. */
const PAGE_DISTANCE = 36;
const PAGE_VELOCITY = 0.35;
const PAGE_DURATION_MS = 380;

function horizontalScroller(target: EventTarget | null): HTMLElement | null {
  let element = target instanceof Element ? target : null;
  while (element && element !== document.body) {
    if (element instanceof HTMLElement) {
      const overflow = getComputedStyle(element).overflowX;
      if ((overflow === "auto" || overflow === "scroll") && element.scrollWidth > element.clientWidth + 1) return element;
    }
    element = element.parentElement;
  }
  return null;
}

/** 자석 정렬 목록에서 각 항목이 왼쪽에 맞춰질 때의 scrollLeft 값들(오름차순)입니다. */
function snapPositions(element: HTMLElement): number[] {
  const max = element.scrollWidth - element.clientWidth;
  const padding = parseFloat(getComputedStyle(element).scrollPaddingLeft) || 0;
  const box = element.getBoundingClientRect();
  const items = [...element.children].filter((child) => getComputedStyle(child).scrollSnapAlign !== "none");
  const positions = (items.length ? items : [...element.children]).map((child) =>
    Math.min(max, Math.max(0, Math.round(element.scrollLeft + child.getBoundingClientRect().left - box.left - padding))));
  return [...new Set([...positions, max])].sort((left, right) => left - right);
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

export function installMouseDragScroll() {
  let drag: {
    element: HTMLElement;
    startX: number;
    startLeft: number;
    snaps: boolean;
    moved: boolean;
    lastX: number;
    lastTime: number;
    velocity: number;
  } | null = null;
  let animation = 0;
  let animatingElement: HTMLElement | null = null;

  const restore = (element: HTMLElement) => {
    element.style.scrollSnapType = "";
    element.style.scrollBehavior = "";
    element.classList.remove("is-drag-scrolling");
  };
  const stopAnimation = () => {
    cancelAnimationFrame(animation);
    if (animatingElement) restore(animatingElement);
    animatingElement = null;
  };

  // 정해진 위치까지 감속 곡선으로 옮긴 뒤 자석 정렬을 되돌립니다.
  const glideTo = (element: HTMLElement, target: number) => {
    const from = element.scrollLeft;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || Math.abs(target - from) < 1) {
      element.scrollLeft = target;
      restore(element);
      return;
    }
    const startedAt = performance.now();
    animatingElement = element;
    const step = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / PAGE_DURATION_MS);
      element.scrollLeft = from + (target - from) * easeOutCubic(progress);
      if (progress < 1) animation = requestAnimationFrame(step);
      else {
        animatingElement = null;
        restore(element);
      }
    };
    animation = requestAnimationFrame(step);
  };

  // 자석 정렬이 없는 목록은 놓을 때의 속도로 미끄러지다 멈춥니다.
  const coast = (element: HTMLElement, velocity: number) => {
    let speed = velocity;
    let last = performance.now();
    animatingElement = element;
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      element.scrollLeft -= speed * dt;
      speed *= 0.94 ** (dt / 16);
      if (Math.abs(speed) > 0.02) animation = requestAnimationFrame(step);
      else {
        animatingElement = null;
        restore(element);
      }
    };
    animation = requestAnimationFrame(step);
  };

  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType !== "mouse" || event.button !== 0) return;
    if (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable]")) return;
    const element = horizontalScroller(event.target);
    if (!element) return;
    stopAnimation();
    drag = {
      element,
      startX: event.clientX,
      startLeft: element.scrollLeft,
      snaps: getComputedStyle(element).scrollSnapType !== "none",
      moved: false,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
    };
  });

  document.addEventListener("pointermove", (event) => {
    if (!drag) return;
    const dx = event.clientX - drag.startX;
    if (!drag.moved) {
      if (Math.abs(dx) < DRAG_THRESHOLD) return;
      drag.moved = true;
      // 끄는 동안은 자석 정렬을 끄고 손가락처럼 바로 따라오게 합니다.
      drag.element.style.scrollSnapType = "none";
      drag.element.style.scrollBehavior = "auto";
      drag.element.classList.add("is-drag-scrolling");
    }
    const dt = event.timeStamp - drag.lastTime;
    if (dt > 0) {
      // 최근 움직임에 더 무게를 두어 놓는 순간의 속도를 구합니다.
      const instant = (event.clientX - drag.lastX) / dt;
      drag.velocity = drag.velocity * 0.6 + instant * 0.4;
    }
    drag.lastX = event.clientX;
    drag.lastTime = event.timeStamp;
    drag.element.scrollLeft = drag.startLeft - dx;
  });

  const finish = (event: PointerEvent) => {
    if (!drag) return;
    const { element, moved, snaps, startLeft, startX } = drag;
    // 한동안 멈춰 있다가 놓으면 튕긴 것이 아니므로 속도를 버립니다.
    const velocity = event.timeStamp - drag.lastTime > 80 ? 0 : drag.velocity;
    drag = null;
    if (!moved) return;

    if (snaps) {
      const positions = snapPositions(element);
      const current = positions.reduce((best, position) =>
        Math.abs(position - startLeft) < Math.abs(best - startLeft) ? position : best, positions[0]);
      const index = positions.indexOf(current);
      const dx = event.clientX - startX;
      // 왼쪽으로 끌면(dx < 0) 다음 카드, 오른쪽으로 끌면 이전 카드입니다.
      // 끌기가 취소되면(pointercancel) 좌표를 믿을 수 없으니 가장 가까운 카드로만 돌아갑니다.
      const direction = event.type === "pointercancel" ? 0 : Math.abs(dx) >= PAGE_DISTANCE || Math.abs(velocity) >= PAGE_VELOCITY ? (dx < 0 ? 1 : -1) : 0;
      const target = positions[Math.min(positions.length - 1, Math.max(0, index + direction))];
      glideTo(element, target);
    } else if (Math.abs(velocity) > 0.05) {
      coast(element, velocity);
    } else {
      restore(element);
    }

    const blockClick = (click: MouseEvent) => {
      click.preventDefault();
      click.stopPropagation();
    };
    window.addEventListener("click", blockClick, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", blockClick, { capture: true }), 0);
  };
  document.addEventListener("pointerup", finish);
  document.addEventListener("pointercancel", finish);
  // 끌다가 이미지·링크가 브라우저 기본 끌기(drag and drop)로 넘어가지 않게 합니다.
  document.addEventListener("dragstart", (event) => {
    if (drag) event.preventDefault();
  });
}
