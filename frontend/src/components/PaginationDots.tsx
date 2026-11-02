import { visiblePageIndices } from "../utils/pagination";

/** 사진·기록 카드의 페이지 점입니다. 점이 많으면 현재 위치 주변만 보이게 밀어 줍니다. */
export default function PaginationDots({
  activeIndex,
  total,
  onSelect,
  className = "",
  label = "사진 페이지",
}: {
  activeIndex: number;
  total: number;
  onSelect: (index: number) => void;
  className?: string;
  label?: string;
}) {
  const pages = visiblePageIndices(activeIndex, total);
  const startIndex = pages[0] ?? 0;
  const endIndex = startIndex + pages.length - 1;
  // 점 하나가 가로 20px 칸을 차지합니다(누르는 영역은 photo-tag-detail.css에서 세로 44px).
  const viewportWidth = pages.length * 20;

  return (
    <div
      className={`photo-slide-indicators photo-slide-indicators--below ${className}`.trim()}
      role="tablist"
      aria-label={label}
      style={{ width: viewportWidth }}
    >
      <div className="photo-slide-indicators-track" style={{ transform: `translateX(-${startIndex * 20}px)` }}>
        {Array.from({ length: total }, (_, index) => {
          const position = index - startIndex;
          const isVisible = position >= 0 && position < pages.length;
          const isEdge =
            isVisible &&
            ((startIndex > 0 && position === 0) || (endIndex < total - 1 && position === pages.length - 1));
          const isNearEdge =
            isVisible &&
            ((startIndex > 0 && position === 1) || (endIndex < total - 1 && position === pages.length - 2));
          const classes = [
            index === activeIndex ? "is-active" : "",
            isEdge ? "is-edge" : "",
            isNearEdge ? "is-near-edge" : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={index}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-label={`${index + 1} / ${total} ${label}`}
              className={classes}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => onSelect(index)}
            >
              <span />
            </button>
          );
        })}
      </div>
    </div>
  );
}
