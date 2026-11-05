import { useState, type Ref } from "react";
import { ProfileCover } from "../../components/BrandAssets";
import PaginationDots from "../../components/PaginationDots";
import { useSwipe } from "../../hooks/useSwipe";

/**
 * 맛객 프로필 맨 위 배경 사진. 프로필 편집에서 올릴 때와 같은 3:2 비율로 보여 줘 사진이 덜 잘리고,
 * 여러 장이면 옆으로 넘겨 봅니다. 아래쪽은 바탕색으로 부드럽게 이어집니다.
 */
export default function ProfileCoverGallery({ covers, ref }: { covers: string[]; ref: Ref<HTMLDivElement> }) {
  const [index, setIndex] = useState(0);
  const hasMany = covers.length > 1;
  const swipe = useSwipe({
    onLeft: () => setIndex((current) => Math.min(covers.length - 1, current + 1)),
    onRight: () => setIndex((current) => Math.max(0, current - 1)),
    isEnabled: hasMany,
  });
  return (
    <div className="r-tasters-profile__cover" ref={ref} {...swipe}>
      <div className="r-tasters-profile__cover-track" style={{ transform: `translateX(-${index * 100}%)` }}>
        {covers.map((src, position) => (
          <ProfileCover key={`${src}-${position}`} src={src} />
        ))}
      </div>
      {hasMany && (
        <PaginationDots
          activeIndex={index}
          total={covers.length}
          onSelect={setIndex}
          label="배경 사진"
          className="r-tasters-profile__cover-dots"
        />
      )}
    </div>
  );
}
