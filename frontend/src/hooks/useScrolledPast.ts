import { useEffect, useState, type RefObject } from "react";

/** 떠 있는 상단 바 높이(px)입니다. 지켜보는 요소의 아래 끝이 이 선 위로 올라가면 바탕·제목을 켭니다. */
const TOP_BAR_HEIGHT_PX = 64;

/**
 * 지켜보는 요소(맛집 상세의 큰 사진 끝 표시, 맛객 프로필의 배경 사진)의 아래 끝이 떠 있는 상단 바 밑으로 지나갔는지 알려 줍니다.
 * 위쪽 큰 사진 위에 투명하게 떠 있던 상단 바가 이때부터 바탕과 제목을 깔아 글자가 사진·본문과 겹치지 않게 합니다.
 */
export function useScrolledPast(target: RefObject<HTMLElement | null>): boolean {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const element = target.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setIsScrolled(entry.boundingClientRect.bottom <= TOP_BAR_HEIGHT_PX),
      { rootMargin: `-${TOP_BAR_HEIGHT_PX}px 0px 0px 0px` },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [target]);

  return isScrolled;
}
