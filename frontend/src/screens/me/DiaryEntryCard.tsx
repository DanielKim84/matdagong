import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import PlaceCard from "../../components/PlaceCard";
import { placeNeighborhood } from "../../models/place";
import { categoryLabel } from "../../utils/format";
import { splitReason } from "../record/recordModel";
import type { DiaryEntry } from "./diary";

/** 기록 달력의 기록 한 줄(보드 14-01): 사진 · 장소 이름 · "분류 · 동네" · 내가 남긴 한 줄 추천 · >. 공용 맛집 카드 모양입니다. */
export default function DiaryEntryCard({ entry }: { entry: DiaryEntry }) {
  const { place, record, photo, isPublic } = entry;
  const note = record?.note.trim() ?? "";
  const headline = splitReason(note).headline || note;
  return (
    <PlaceCard
      place={place}
      photo={photo}
      meta={
        <>
          {[categoryLabel(place.category).split(" · ")[0], placeNeighborhood(place)].filter(Boolean).join(" · ")}
          {!isPublic && <span className="r-tag r-place-card__private">나만 보기</span>}
        </>
      }
      detail={headline && <span className="r-place-card__note">“{headline}”</span>}
      trailing={<Icon name="chevron" />}
      onOpen={() => go("place", place.id)}
    />
  );
}
