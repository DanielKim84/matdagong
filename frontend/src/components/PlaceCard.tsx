import type { ReactNode } from "react";
import type { Place } from "../models/place";
import PlaceThumb from "./PlaceThumb";

/**
 * 맛집 목록 한 줄의 공통 카드입니다(발견 목록, 맛집 다이어리, 맛객 프로필 기록). 흰 카드에 사진 · 이름 · 한 줄 정보 ·
 * 덧붙임을 같은 모양으로 그리고, 오른쪽에 하트·표시 같은 덧붙임(trailing)을 둡니다.
 * 목록마다 모양을 따로 만들지 않고 이 카드를 씁니다.
 */
export default function PlaceCard({
  place,
  photo,
  meta,
  detail,
  trailing,
  onOpen,
}: {
  place: Place;
  photo?: string;
  /** 이름 아래 한 줄(분류 · 거리 · 날짜 등) */
  meta?: ReactNode;
  /** 그 아래 내용(맛객 줄, 추천 이유 등) */
  detail?: ReactNode;
  trailing?: ReactNode;
  onOpen: () => void;
}) {
  return (
    <div className="r-place-card">
      <button type="button" className="r-place-card__main" onClick={onOpen}>
        <PlaceThumb place={place} photo={photo} fallback="icon" className="r-place-card__thumb" />
        <span className="r-place-card__copy">
          <b>{place.name}</b>
          {meta && <small className="r-place-card__meta">{meta}</small>}
          {detail}
        </span>
      </button>
      {trailing}
    </div>
  );
}
