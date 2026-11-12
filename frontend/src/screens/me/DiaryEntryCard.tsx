import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import PlaceCard from "../../components/PlaceCard";
import { categoryLabel, formatRelativeTime } from "../../utils/format";
import { formatDay, type DiaryEntry } from "./diary";

/** 다이어리 기록 한 줄: 사진, 장소 이름, 날짜, 내가 남긴 한마디(없으면 분류 · 주소). 공용 맛집 카드 모양입니다. */
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
    <PlaceCard
      place={place}
      photo={photo}
      meta={
        <>
          {when}
          {!isPublic && <span className="r-tag r-place-card__private">나만 보기</span>}
        </>
      }
      detail={
        <span className="r-place-card__note">
          {record?.note
            ? `“${record.note}”`
            : [categoryLabel(place.category), place.address].filter(Boolean).join(" · ")}
        </span>
      }
      trailing={<Icon name="chevron" />}
      onOpen={() => go("place", place.id)}
    />
  );
}
