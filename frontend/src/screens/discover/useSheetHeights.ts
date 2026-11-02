import { useLayoutEffect, useState, type CSSProperties, type RefObject } from "react";
import type { SheetState } from "./discoverModel";

// 접힘 시트는 제목 줄(72px)과 떠 있는 하단 탭 자리(탭 82px + 여백 22px)를 더한 높이입니다. discover.css의 --r-discover-peek와 같은 값입니다.
const PEEK_HEIGHT = 176;

/**
 * 목록 시트의 접힘·중간·펼침 높이를 화면과 상단 검색 영역 크기에 맞춰 계산합니다.
 * 떠 있는 장소 카드 높이도 재서(--r-discover-float) 지도 버튼들이 카드 바로 위에 오게 합니다.
 */
export function useSheetHeights(
  root: RefObject<HTMLElement | null>,
  top: RefObject<HTMLElement | null>,
  float: RefObject<HTMLElement | null>,
): { heights: Record<SheetState, number>; style: CSSProperties } {
  const [size, setSize] = useState({ height: 0, top: 0, float: 0 });

  useLayoutEffect(() => {
    const measure = () => {
      const height = root.current?.clientHeight ?? 0;
      const topBottom = top.current ? top.current.offsetTop + top.current.offsetHeight : 0;
      const floatHeight = float.current?.offsetHeight ?? 0;
      setSize((current) =>
        current.height === height && current.top === topBottom && current.float === floatHeight
          ? current
          : { height, top: topBottom, float: floatHeight },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (root.current) observer.observe(root.current);
    if (top.current) observer.observe(top.current);
    if (float.current) observer.observe(float.current);
    return () => observer.disconnect();
  }, [root, top, float]);

  const heights: Record<SheetState, number> = {
    peek: PEEK_HEIGHT,
    half: Math.round(size.height * 0.5),
    full: Math.max(PEEK_HEIGHT, size.height - size.top - 8),
  };
  // 측정 전에는 CSS 기본값(비율)을 씁니다.
  const style: CSSProperties = size.height
    ? ({
        "--r-discover-half": `${heights.half}px`,
        "--r-discover-full": `${heights.full}px`,
        "--r-discover-float": `${size.float}px`,
      } as CSSProperties)
    : {};
  return { heights, style };
}
