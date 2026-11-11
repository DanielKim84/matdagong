import { useRef, type PointerEvent, type ReactNode } from "react";
import { useAppData } from "../../app/AppData";
import type { SheetState, SortOrder } from "./discoverModel";

const SHEET_ORDER: SheetState[] = ["peek", "half", "full"];
const SHEET_STATE_LABELS: Record<SheetState, string> = { peek: "접힘", half: "중간", full: "펼침" };
/** 이만큼 움직여야 누르기가 아닌 끌기로 봅니다(px). */
const DRAG_START_PX = 6;
/** 놓은 높이가 원래 단계에 가까워도 이만큼 넘게 끌었으면 끈 방향으로 한 단계 옮깁니다(px). */
const STEP_DRAG_PX = 40;

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
  /** 화면 읽기용 시트 이름 */
  label?: string;
  /**
   * 기본 정렬(priority)의 이름. 발견은 추천순(믿고 가는 맛객 → 구독 → 취향 맞는 맛객 → 그 밖, 같은 단계에서는 가까운 곳 먼저),
   * 내 지도는 내 기록 → 다녀온 곳 → 가볼 곳 순서입니다.
   */
  priorityLabel?: string;
};

/** 아래에서 끌어 올리는 목록 시트입니다(발견·내 지도). 손잡이를 누르거나 끌어 접힘 → 중간 → 펼침으로 바꿉니다. */
export default function DiscoverSheet({
  state,
  onStateChange,
  heights,
  title,
  sort,
  canSortByDistance,
  onSortChange,
  children,
  label = "맛객 기록 목록",
  priorityLabel = "추천순",
}: Props) {
  const sortOptions: { value: SortOrder; label: string }[] = [
    { value: "priority", label: priorityLabel },
    { value: "distance", label: "가까운 순" },
  ];
  const { actions } = useAppData();
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
    if (!current.hasMoved && Math.abs(delta) < DRAG_START_PX) return;
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
    let next = SHEET_ORDER.reduce((best, item) =>
      Math.abs(heights[item] - finalHeight) < Math.abs(heights[best] - finalHeight) ? item : best,
    );
    const index = SHEET_ORDER.indexOf(state);
    if (next === state && Math.abs(delta) > STEP_DRAG_PX)
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

  function chooseSort(next: SortOrder) {
    if (next === "distance" && !canSortByDistance) {
      actions.notify({
        kind: "info",
        title: "내 위치가 필요해요",
        message: "지도 오른쪽의 ‘내 위치’를 켜면 가까운 순으로 볼 수 있어요.",
      });
      return;
    }
    onSortChange(next);
  }

  return (
    <section ref={sheet} className="r-discover-sheet" aria-label={label}>
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
          {/* 두 정렬을 나란히 보여 줘 지금 어떤 순서인지, 눌러서 무엇으로 바뀌는지 바로 알 수 있게 합니다. */}
          <div className="r-discover-sheet__sort" role="group" aria-label="목록 정렬">
            {sortOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={sort === option.value ? "is-on" : ""}
                aria-pressed={sort === option.value}
                onClick={() => chooseSort(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="r-discover-sheet__body" inert={state === "peek"}>
        {children}
      </div>
    </section>
  );
}
