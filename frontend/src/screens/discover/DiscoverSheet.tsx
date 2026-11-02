import { useRef, type PointerEvent, type ReactNode } from "react";
import Icon from "../../components/Icon";
import type { SheetState, SortOrder } from "./discoverModel";

const SHEET_ORDER: SheetState[] = ["peek", "half", "full"];
const SHEET_STATE_LABELS: Record<SheetState, string> = { peek: "접힘", half: "중간", full: "펼침" };

type Props = {
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  /** 접힘·중간·펼침 높이(px). 끌기를 놓았을 때 가까운 높이로 맞춥니다. */
  heights: Record<SheetState, number>;
  title: string;
  sort: SortOrder;
  canSortByDistance: boolean;
  onSortChange: (sort: SortOrder) => void;
  /** 시트 본문(목록 또는 오류·빈 화면) */
  children: ReactNode;
};

/** 아래에서 끌어 올리는 목록 시트입니다. 손잡이를 누르거나 끌어 접힘 → 중간 → 펼침으로 바꿉니다. */
export default function DiscoverSheet({
  state,
  onStateChange,
  heights,
  title,
  sort,
  canSortByDistance,
  onSortChange,
  children,
}: Props) {
  const sheet = useRef<HTMLElement>(null);
  const drag = useRef<{ startY: number; startHeight: number; hasMoved: boolean } | null>(null);
  const shouldSuppressClick = useRef(false);

  function startDrag(event: PointerEvent<HTMLElement>) {
    if (event.target instanceof Element && event.target.closest(".r-discover-sheet__sort")) return;
    const element = sheet.current;
    if (!element) return;
    drag.current = { startY: event.clientY, startHeight: element.getBoundingClientRect().height, hasMoved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLElement>) {
    const current = drag.current,
      element = sheet.current;
    if (!current || !element) return;
    const delta = event.clientY - current.startY;
    if (!current.hasMoved && Math.abs(delta) < 6) return;
    current.hasMoved = true;
    element.classList.add("is-dragging");
    const next = Math.min(heights.full, Math.max(heights.peek, current.startHeight - delta));
    element.style.height = `${next}px`;
  }
  function endDrag(event: PointerEvent<HTMLElement>) {
    const current = drag.current,
      element = sheet.current;
    drag.current = null;
    if (!current || !element || !current.hasMoved) return;
    shouldSuppressClick.current = true;
    const delta = event.clientY - current.startY;
    const finalHeight = element.getBoundingClientRect().height;
    element.classList.remove("is-dragging");
    element.style.removeProperty("height");
    // 가장 가까운 높이로 맞추되, 충분히 끌었으면 끈 방향으로 한 단계는 움직입니다.
    let next = SHEET_ORDER.reduce((best, item) =>
      Math.abs(heights[item] - finalHeight) < Math.abs(heights[best] - finalHeight) ? item : best,
    );
    const index = SHEET_ORDER.indexOf(state);
    if (next === state && Math.abs(delta) > 40)
      next = SHEET_ORDER[Math.min(SHEET_ORDER.length - 1, Math.max(0, index + (delta < 0 ? 1 : -1)))];
    onStateChange(next);
  }
  function cancelDrag() {
    drag.current = null;
    sheet.current?.classList.remove("is-dragging");
    sheet.current?.style.removeProperty("height");
  }
  function cycle() {
    if (shouldSuppressClick.current) {
      shouldSuppressClick.current = false;
      return;
    }
    onStateChange(state === "peek" ? "half" : state === "half" ? "full" : "peek");
  }

  const nextSort: SortOrder = sort === "priority" && canSortByDistance ? "distance" : "priority";
  return (
    <section ref={sheet} className="r-discover-sheet" aria-label="맛객 기록 목록">
      <div
        className="r-discover-sheet__head"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
      >
        <button
          type="button"
          className="r-discover-sheet__grab"
          aria-expanded={state !== "peek"}
          aria-label={`목록 크기 바꾸기, 지금 ${SHEET_STATE_LABELS[state]}`}
          onClick={cycle}
        >
          <i aria-hidden="true" />
        </button>
        <div className="r-discover-sheet__title">
          <h2>{title}</h2>
          <button
            type="button"
            className="r-discover-sheet__sort"
            onClick={() => onSortChange(nextSort)}
            disabled={!canSortByDistance && sort === "priority"}
            aria-label={`정렬: ${sort === "distance" ? "가까운 순" : "구독 먼저"}${canSortByDistance ? ", 눌러서 바꾸기" : ""}`}
          >
            {sort === "distance" ? "가까운 순" : "구독 먼저"}
            {canSortByDistance && <Icon name="list" />}
          </button>
        </div>
      </div>

      <div className="r-discover-sheet__body" inert={state === "peek"}>
        {children}
      </div>
    </section>
  );
}
