import { useEffect, useState, type RefObject } from "react";

/** 표시 요소(큰 사진 끝)가 상단 바(64px) 아래로 지나갔는지 알려 줍니다. 떠 있는 상단 바의 바탕·제목을 켜는 데 씁니다. */
export function useHeroScrolled(heroEnd: RefObject<HTMLElement | null>): boolean {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const target = heroEnd.current;
    if (!target || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setIsScrolled(entry.boundingClientRect.top < 64), {
      rootMargin: "-64px 0px 0px 0px",
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [heroEnd]);

  return isScrolled;
}
