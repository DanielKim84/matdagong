import { visiblePageIndices } from "../utils/pagination";

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
  const viewportWidth = Math.max(0, pages.length * 20 - 3);

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
        const visible = position >= 0 && position < pages.length;
        const edge = visible && ((startIndex > 0 && position === 0) || (endIndex < total - 1 && position === pages.length - 1));
        const nearEdge = visible && ((startIndex > 0 && position === 1) || (endIndex < total - 1 && position === pages.length - 2));
        const classes = [index === activeIndex ? "active" : "", edge ? "edge" : "", nearEdge ? "near-edge" : ""]
          .filter(Boolean).join(" ");
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
