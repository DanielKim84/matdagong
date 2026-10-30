import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Icon from "../../components/Icon";
import { Avatar } from "../../components/BrandAssets";
import { swipeHandlers, wrapIndex } from "../../utils/swipe";
import { avatarFallback, avatarSource, type PlacePhoto } from "./placeRecords";

/** 전체 화면 사진 보기. 좌우로 넘기고, 누가 찍은 어떤 메뉴인지 아래에 보여 줍니다. */
export default function PhotoViewer({ photos, startIndex, placeName, onClose }: {
  photos: PlacePhoto[];
  startIndex: number;
  placeName: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(() => Math.min(Math.max(0, startIndex), photos.length - 1));
  const closeButton = useRef<HTMLButtonElement>(null);
  const thumbs = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const total = photos.length;
  const step = (direction: number) => setIndex((current) => wrapIndex(current, direction, total));

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.documentElement.style.overflow;
    // 사진을 보는 동안 뒤 화면이 같이 스크롤되지 않게 잠급니다.
    document.documentElement.style.overflow = "hidden";
    closeButton.current?.focus({ preventScroll: true });
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      else if (event.key === "ArrowRight") setIndex((current) => wrapIndex(current, 1, total));
      else if (event.key === "ArrowLeft") setIndex((current) => wrapIndex(current, -1, total));
    }
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.documentElement.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [total]);

  useEffect(() => {
    thumbs.current?.children[index]?.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [index]);

  const photo = photos[index];
  if (!photo) return null;

  return createPortal(
    <div className="r-place-viewer" role="dialog" aria-modal="true" aria-label={`${placeName} 사진 보기`}>
      <header className="r-place-viewer__top">
        <button type="button" ref={closeButton} className="r-place-glass r-place-glass--dark" onClick={onClose} aria-label="사진 보기 닫기">
          <Icon name="close" />
        </button>
        <span aria-live="polite">{index + 1} / {total}</span>
        <span className="r-place-viewer__spacer" aria-hidden="true" />
      </header>
      <div className="r-place-viewer__stage" {...swipeHandlers(step, { enabled: total > 1 })}>
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
        {total > 1 && <>
          <button type="button" className="r-place-viewer__nav r-place-viewer__nav--prev" onClick={() => step(-1)} aria-label="이전 사진">
            <Icon name="back" />
          </button>
          <button type="button" className="r-place-viewer__nav r-place-viewer__nav--next" onClick={() => step(1)} aria-label="다음 사진">
            <Icon name="chevron" />
          </button>
        </>}
      </div>
      <footer className="r-place-viewer__bottom">
        <div className="r-place-viewer__author">
          <Avatar src={avatarSource(photo.record)} fallbackSrc={avatarFallback(photo.record)} name={photo.record.tasterName} variant={photo.record.avatarVariant} />
          <div>
            <b>{photo.record.tasterName}</b>
            {photo.caption && <span>{photo.caption}</span>}
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
