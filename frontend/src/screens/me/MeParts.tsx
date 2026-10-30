import { go } from "../../app/navigation";
import { FoodPhoto } from "../../components/BrandAssets";
import Icon from "../../components/Icon";
import { relativeTime } from "../../components/ui";
import type { Place } from "../../models/place";
import { formatDay, type DiaryEntry } from "./diary";

/** 내 사진이 있으면 사진, 없으면 기본 음식 그림을 채웁니다. */
export function MeThumb({ place, photo, className = "" }: { place: Place; photo?: string; className?: string }) {
  return (
    <span className={`r-me-thumb ${className}`}>
      {photo ? <img src={photo} alt="" loading="lazy" decoding="async" /> : <FoodPhoto place={place} />}
    </span>
  );
}

/** 다이어리 기록 한 줄: 사진, 날짜, 장소 이름, 내가 남긴 한마디. */
export function DiaryEntryCard({ entry, showRelative = false }: { entry: DiaryEntry; showRelative?: boolean }) {
  const { place, record, date, photo, isPublic } = entry;
  const when = date ? (showRelative ? relativeTime(record?.recordedAt) : formatDay(date)) : "날짜 없음";
  return (
    <button type="button" className="r-card r-me-entry" onClick={() => go("place", place.id)}>
      <MeThumb place={place} photo={photo} className="r-me-entry__thumb" />
      <span className="r-me-entry__copy">
        <small>
          {when}
          {!isPublic && <span className="r-tag r-tag--neutral r-me-entry__private">나만 보기</span>}
        </small>
        <b>{place.name}</b>
        <span className="r-me-entry__note">
          {record?.note ? `“${record.note}”` : `${place.category}${place.address ? ` · ${place.address}` : ""}`}
        </span>
      </span>
      <Icon name="chevron" />
    </button>
  );
}

/** 다른 화면으로 가는 벤토 타일입니다. */
export function MeTile({
  icon,
  value,
  label,
  onClick,
  tone = "default",
  caption,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  value: string;
  label: string;
  onClick: () => void;
  tone?: "default" | "amber";
  caption?: string;
}) {
  return (
    <button type="button" className={`r-card r-me-tile r-me-tile--${tone}`} onClick={onClick}>
      <span className="r-badge-icon r-me-tile__icon"><Icon name={icon} /></span>
      <b className="r-me-tile__value">{value}</b>
      <span className="r-me-tile__label">{label}</span>
      {caption && <small className="r-me-tile__caption">{caption}</small>}
    </button>
  );
}
