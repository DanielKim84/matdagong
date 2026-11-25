import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../../components/Icon";
import PaginationDots from "../../components/PaginationDots";
import TasterAvatar from "../../components/TasterAvatar";
import { useModalLock } from "../../hooks/useModalLock";
import { useSwipe } from "../../hooks/useSwipe";
import { formatWon } from "../../utils/format";
import { wrapIndex } from "../../utils/pagination";
import type { PlacePhoto } from "./placeRecords";

/** 사진을 넘기는 스와이프 거리(px). 전체 화면이라 기본값보다 조금 짧게 둡니다. */
const SWIPE_THRESHOLD_PX = 45;

/**
 * 전체 화면 사진 보기(보드 10-01): 흰 바탕에 큰 사진, 사진 위 오른쪽 닫기와 양옆 넘기기, 사진 아래 점(몇 번째인지)과
 * 누가 찍은 어떤 메뉴인지를 보여 줍니다. 좌우로 밀거나 키보드 화살표로도 넘깁니다.
 */
export default function PhotoViewer({
  photos,
  startIndex,
  placeName,
  onClose,
}: {
  photos: PlacePhoto[];
  startIndex: number;
  placeName: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, startIndex), photos.length - 1));
  const closeButton = useRef<HTMLButtonElement>(null);
  const total = photos.length;
  const step = (direction: number) => setIndex((current) => wrapIndex(current, direction, total));
  const swipe = useSwipe({
    onLeft: () => step(1),
    onRight: () => step(-1),
    threshold: SWIPE_THRESHOLD_PX,
    isEnabled: total > 1,
  });

  // 사진을 보는 동안 뒤 화면이 같이 스크롤되지 않게 잠그고, 좌우 화살표로 넘깁니다.
  useModalLock(onClose, {
    initialFocus: closeButton,
    onKeyDown: (event) => {
      if (event.key === "ArrowRight") step(1);
      else if (event.key === "ArrowLeft") step(-1);
    },
  });

  const photo = photos[index];
  if (!photo) return null;

  return createPortal(
    <div className="r-place-viewer" role="dialog" aria-modal="true" aria-label={`${placeName} 사진 보기`}>
      <header className="r-place-viewer__top">
        <span className="r-place-viewer__spacer" aria-hidden="true" />
        <span className="visually-hidden" aria-live="polite">
          {index + 1} / {total}
        </span>
        <button
          type="button"
          ref={closeButton}
          className="r-place-viewer__close"
          onClick={onClose}
          aria-label="사진 보기 닫기"
        >
          <Icon name="close" />
        </button>
      </header>
      <div className="r-place-viewer__stage" {...swipe}>
        <div className="r-place-viewer__track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {photos.map((item, itemIndex) => (
            <div className="r-place-viewer__slide" key={item.src} aria-hidden={itemIndex !== index}>
              <img
                src={item.src}
                alt={`${item.record.tasterName}님이 올린 ${placeName} 사진${item.caption ? ` · ${item.caption}` : ""}`}
                loading={Math.abs(itemIndex - index) <= 1 ? "eager" : "lazy"}
                decoding="async"
              />
            </div>
          ))}
        </div>
        {total > 1 && (
          <>
            <button
              type="button"
              className="r-place-viewer__nav r-place-viewer__nav--prev"
              onClick={() => step(-1)}
              aria-label="이전 사진"
            >
              <Icon name="back" />
            </button>
            <button
              type="button"
              className="r-place-viewer__nav r-place-viewer__nav--next"
              onClick={() => step(1)}
              aria-label="다음 사진"
            >
              <Icon name="chevron" />
            </button>
          </>
        )}
      </div>
      <footer className="r-place-viewer__bottom">
        {total > 1 && <PaginationDots activeIndex={index} total={total} onSelect={setIndex} label="사진" />}
        {photo.isMenu && photo.menuName && (
          <div className="r-place-viewer__menu">
            <span className="r-place-viewer__menu-kind">추천 메뉴</span>
            <b>{photo.menuName}</b>
            {photo.menuPrice != null && <strong>{formatWon(photo.menuPrice)}</strong>}
          </div>
        )}
        <div className="r-place-viewer__author">
          <TasterAvatar taster={photo.record} />
          <div>
            <b>{photo.record.tasterName}</b>
            <span>{photo.isMenu ? "메뉴 사진" : "방문 사진"}</span>
          </div>
        </div>
      </footer>
    </div>,
    document.body,
  );
}
