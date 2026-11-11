import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../../components/Icon";
import TasterAvatar from "../../components/TasterAvatar";
import { useModalLock } from "../../hooks/useModalLock";
import { useSwipe } from "../../hooks/useSwipe";
import { formatWon } from "../../utils/format";
import { wrapIndex } from "../../utils/pagination";
import type { PlacePhoto } from "./placeRecords";

/** 사진을 넘기는 스와이프 거리(px). 전체 화면이라 기본값보다 조금 짧게 둡니다. */
const SWIPE_THRESHOLD_PX = 45;

/** 전체 화면 사진 보기. 좌우로 넘기고, 누가 찍은 어떤 메뉴인지 아래에 보여 줍니다. */
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
  const thumbs = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    thumbs.current?.children[index]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  const photo = photos[index];
  if (!photo) return null;

  return createPortal(
    <div className="r-place-viewer" role="dialog" aria-modal="true" aria-label={`${placeName} 사진 보기`}>
      <header className="r-place-viewer__top">
        <button
          type="button"
          ref={closeButton}
          className="r-place-viewer__close"
          onClick={onClose}
          aria-label="사진 보기 닫기"
        >
          <Icon name="close" />
        </button>
        <span aria-live="polite">
          {index + 1} / {total}
        </span>
        <span className="r-place-viewer__spacer" aria-hidden="true" />
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
        {total > 1 && (
          <div className="r-place-viewer__thumbs" ref={thumbs}>
            {photos.map((item, itemIndex) => (
              <button
                type="button"
                key={item.src}
                className={itemIndex === index ? "is-on" : ""}
                onClick={() => setIndex(itemIndex)}
                aria-label={`${itemIndex + 1}번째 사진 보기`}
                aria-current={itemIndex === index}
              >
                <img src={item.src} alt="" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        )}
      </footer>
    </div>,
    document.body,
  );
}
