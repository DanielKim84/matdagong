import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import PlaceThumb from "../../components/PlaceThumb";
import { formatRelativeTime } from "../../utils/format";
import { formatDay, type DiaryEntry } from "./diary";

/** 다이어리 기록 한 줄: 사진, 날짜, 장소 이름, 내가 남긴 한마디. */
export default function DiaryEntryCard({
  entry,
  shouldShowRelative = false,
}: {
  entry: DiaryEntry;
  shouldShowRelative?: boolean;
}) {
  const { place, record, date, photo, isPublic } = entry;
  const when = date ? (shouldShowRelative ? formatRelativeTime(record?.recordedAt) : formatDay(date)) : "날짜 없음";
  return (
    <button type="button" className="r-card r-me-entry" onClick={() => go("place", place.id)}>
      <PlaceThumb place={place} photo={photo} />
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
