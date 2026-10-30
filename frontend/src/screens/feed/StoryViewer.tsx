import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { relativeTime } from "../../components/ui";
import { shortArea, type StoryGroup } from "./feedRecords";

/**
 * 전체 화면 스토리 뷰어입니다. 진행 막대가 다 차면 다음 기록으로 넘어가고,
 * 화면 왼쪽을 누르면 이전, 오른쪽을 누르면 다음 기록입니다. 마지막 맛객 다음엔 닫힙니다.
 */
export default function StoryViewer({
  groups,
  startGroup,
  likedPlaceIds,
  onLike,
  onSeen,
  onClose,
}: {
  groups: StoryGroup[];
  startGroup: number;
  likedPlaceIds: string[];
  onLike: (placeId: string) => Promise<void>;
  onSeen: (tasterId: string, time: number) => void;
  onClose: () => void;
}) {
  const [position, setPosition] = useState({ group: startGroup, item: 0 });
  const [paused, setPaused] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const group = groups[position.group];
  const record = group?.records[position.item];

  function next() {
    if (!group) return onClose();
    if (position.item + 1 < group.records.length) setPosition({ group: position.group, item: position.item + 1 });
    else if (position.group + 1 < groups.length) setPosition({ group: position.group + 1, item: 0 });
    else onClose();
  }

  function previous() {
    if (position.item > 0) setPosition({ group: position.group, item: position.item - 1 });
    else if (position.group > 0) {
      const previousGroup = groups[position.group - 1];
      setPosition({ group: position.group - 1, item: previousGroup.records.length - 1 });
    }
  }

  // 열려 있는 동안 뒤 화면 스크롤을 막고, 닫히면 원래 포커스로 돌려 놓습니다.
  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus?.();
    };
  }, []);

  // 본 기록은 맛객별로 기억해 스토리 링을 끕니다.
  useEffect(() => {
    if (group && record) onSeen(group.tasterId, record.time);
  }, [group, record, onSeen]);

  // 목록이 바뀌어 위치가 사라지면 닫습니다.
  useEffect(() => {
    if (!record) onClose();
  }, [record, onClose]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") previous();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!group || !record) return null;
  const { place, taster } = record;
  const liked = likedPlaceIds.includes(place.id);
  const area = shortArea(place);
  const when = relativeTime(taster.recordedAt);

  return createPortal(
    <div className="r-feed-story" role="dialog" aria-modal="true" aria-label={`${group.name}의 기록 스토리`}>
      <div className="r-feed-story__media" aria-hidden="true">
        {record.photo ? <img src={record.photo} alt="" /> : (
          <span className="r-feed-story__blank"><Icon name={place.category.includes("카페") ? "coffee" : "fork"} /></span>
        )}
      </div>
      <div className="r-feed-story__scrim-top" aria-hidden="true" />
      <div className="r-feed-story__scrim-bottom" aria-hidden="true" />

      <div className="r-feed-story__bars" aria-hidden="true">
        {group.records.map((item, index) => (
          <span key={item.key} className={index < position.item ? "is-done" : ""}>
            {index === position.item && (
              <i
                key={`${position.group}-${position.item}`}
                className={paused ? "is-paused" : ""}
                onAnimationEnd={next}
              />
            )}
          </span>
        ))}
      </div>

      <header className="r-feed-story__head">
        <button type="button" className="r-feed-story__author" onClick={() => { onClose(); go("profile", group.tasterId); }}>
          <Avatar src={group.avatar} fallbackSrc={group.fallbackAvatar} name={group.name} variant={group.variant} />
          <span>
            <b>{group.name}</b>
            {when && <small>{when}</small>}
          </span>
        </button>
        <button type="button" ref={closeRef} className="r-icon-button r-feed-story__close" aria-label="스토리 닫기" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>

      <button
        type="button"
        className="r-feed-story__tap r-feed-story__tap--prev"
        aria-label="이전 기록"
        onClick={previous}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />
      <button
        type="button"
        className="r-feed-story__tap r-feed-story__tap--next"
        aria-label="다음 기록"
        onClick={next}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />

      <div className="r-feed-story__panel">
        <span className="r-feed-story__place">{place.name}{area ? ` · ${area}` : ""}</span>
        {taster.note && <p className="r-feed-story__quote">“{taster.note}”</p>}
        <span className="r-feed-story__count">{position.item + 1} / {group.records.length}</span>
        <div className="r-feed-story__actions">
          <button type="button" className="r-button r-button--primary" onClick={() => { onClose(); go("place", place.id); }}>
            장소 보기
          </button>
          <button
            type="button"
            className={`r-feed-story__like${liked ? " is-on" : ""}`}
            aria-label={liked ? "내 맛집에서 빼기" : "내 맛집에 저장"}
            aria-pressed={liked}
            onClick={async () => {
              // 확인 창이 뜰 수 있어 저장 처리 중에는 넘김을 멈춥니다.
              setPaused(true);
              try { await onLike(place.id); } finally { setPaused(false); }
            }}
          >
            <Icon name="heart" filled={liked} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
