import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import PlaceThumb from "../../components/PlaceThumb";
import { useModalLock } from "../../hooks/useModalLock";
import { formatRelativeTime } from "../../utils/format";
import { shortArea, type StoryGroup } from "./feedRecords";

/**
 * 전체 화면 스토리 뷰어입니다. 진행 막대가 다 차면 다음 기록으로 넘어가고,
 * 화면 왼쪽을 누르면 이전, 오른쪽을 누르면 다음 기록입니다. 마지막 맛객 다음엔 닫힙니다.
 */
export default function StoryViewer({
  groups,
  startGroup,
  onSeen,
  onClose,
}: {
  groups: StoryGroup[];
  startGroup: number;
  onSeen: (tasterId: string, recordKey: string) => void;
  onClose: () => void;
}) {
  const { likedPlaceIds, actions } = useAppData();
  const [position, setPosition] = useState({ group: startGroup, item: 0 });
  const [isPaused, setIsPaused] = useState(false);
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

  // 뒤 화면 스크롤 잠금·Esc 닫기·포커스 복원. 키 처리는 훅이 최신 함수를 부르므로 매번 새로 넘겨도 됩니다.
  useModalLock(onClose, {
    initialFocus: closeRef,
    onKeyDown: (event) => {
      if (event.key === "ArrowRight") next();
      else if (event.key === "ArrowLeft") previous();
    },
  });

  // 본 기록은 맛객별로 기억합니다. 다음에 열면 안 본 기록만 이어서 보이고, 다 보면 링이 꺼집니다.
  useEffect(() => {
    if (group && record) onSeen(group.tasterId, record.key);
  }, [group, record, onSeen]);

  // 목록이 바뀌어 위치가 사라지면 닫습니다.
  useEffect(() => {
    if (!record) onClose();
  }, [record, onClose]);

  if (!group || !record) return null;
  const { place, taster } = record;
  const isLiked = likedPlaceIds.includes(place.id);
  const area = shortArea(place);
  const when = formatRelativeTime(taster.recordedAt);
  // 화면 왼쪽·오른쪽을 누르고 있는 동안에는 넘김을 멈춥니다.
  const holdToPause = {
    onPointerDown: () => setIsPaused(true),
    onPointerUp: () => setIsPaused(false),
    onPointerLeave: () => setIsPaused(false),
  };

  async function chooseLike() {
    // 하트 선택 시트가 떠 있고 저장하는 동안에는 넘김을 멈춥니다.
    setIsPaused(true);
    try {
      await actions.chooseLike(place.id);
    } finally {
      setIsPaused(false);
    }
  }

  return createPortal(
    <div className="r-feed-story" role="dialog" aria-modal="true" aria-label={`${group.name}의 기록 스토리`}>
      <div className="r-feed-story__media" aria-hidden="true">
        {record.photo ? (
          // 사진 비율과 상관없이 잘리지 않게, 같은 사진을 흐리게 깔고 그 위에 사진 전체를 둡니다(가로 사진도 그대로 보임).
          <>
            <img className="r-feed-story__backdrop" src={record.photo} alt="" decoding="async" />
            <img className="r-feed-story__photo" src={record.photo} alt="" decoding="async" />
          </>
        ) : (
          <PlaceThumb place={place} fallback="icon" />
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
                className={isPaused ? "is-paused" : ""}
                onAnimationEnd={next}
              />
            )}
          </span>
        ))}
      </div>

      <header className="r-feed-story__head">
        <button
          type="button"
          className="r-feed-story__author"
          onClick={() => {
            onClose();
            go("profile", group.tasterId);
          }}
        >
          <Avatar src={group.avatar} fallbackSrc={group.fallbackAvatar} name={group.name} variant={group.variant} />
          <span>
            <b>{group.name}</b>
            {when && <small>{when}</small>}
          </span>
        </button>
        <button
          type="button"
          ref={closeRef}
          className="r-icon-button r-feed-story__close"
          aria-label="스토리 닫기"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </header>

      <button
        type="button"
        className="r-feed-story__tap r-feed-story__tap--prev"
        aria-label="이전 기록"
        onClick={previous}
        {...holdToPause}
      />
      <button
        type="button"
        className="r-feed-story__tap r-feed-story__tap--next"
        aria-label="다음 기록"
        onClick={next}
        {...holdToPause}
      />

      <div className="r-feed-story__panel">
        <span className="r-feed-story__place">
          {place.name}
          {area ? ` · ${area}` : ""}
        </span>
        {taster.note && <p className="r-feed-story__quote">“{taster.note}”</p>}
        <span className="r-feed-story__count">
          {position.item + 1} / {group.records.length}
        </span>
        <div className="r-feed-story__actions">
          <button
            type="button"
            className="r-button r-button--primary"
            onClick={() => {
              onClose();
              go("place", place.id);
            }}
          >
            장소 보기
          </button>
          <button
            type="button"
            className={`r-feed-story__like${isLiked ? " is-on" : ""}`}
            aria-label={isLiked ? "내 맛집 바꾸기" : "내 맛집에 저장"}
            aria-pressed={isLiked}
            onClick={() => void chooseLike()}
          >
            <Icon name="heart" filled={isLiked} />
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
