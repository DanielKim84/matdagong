import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import PlaceCard from "../../components/PlaceCard";
import { EmptyState } from "../../components/ui";
import type { Taster } from "../../models/place";
import { categoryLabel, formatRelativeTime } from "../../utils/format";
import type { TasterRecord } from "./tasterData";
import TasterMapCard from "./TasterMapCard";

/** 맛객 프로필의 기록을 지도나 목록으로 보여 줍니다. 기록이 없으면 빈 화면 안내입니다. */
export default function TasterRecords({
  taster,
  records,
  view,
  isOwn,
}: {
  taster: Taster;
  records: TasterRecord[];
  view: "map" | "list";
  isOwn: boolean;
}) {
  const app = useAppData();
  if (!records.length) return <EmptyRecords isOwn={isOwn} />;
  if (view === "map") {
    return <TasterMapCard taster={taster} places={records.map((record) => record.place)} isOwn={isOwn} />;
  }
  return (
    <ul className="r-place-cards">
      {records.map(({ place, entry }) => {
        // 이 맛객의 기록 사진만 씁니다(placePhoto처럼 다른 맛객의 사진으로 넘어가지 않음). 내 프로필이면 내 사진까지.
        const photo = entry.photos?.[0] ?? (isOwn ? app.photoFor(place.id) : undefined);
        const when = formatRelativeTime(entry.recordedAt);
        return (
          <li key={place.id}>
            <PlaceCard
              place={place}
              photo={photo}
              meta={
                <>
                  {[categoryLabel(place.category), when].filter(Boolean).join(" · ")}
                  {isOwn && entry.visibility === "PRIVATE" && (
                    <span className="r-tag r-place-card__private">나만 보기</span>
                  )}
                </>
              }
              detail={entry.note && <span className="r-place-card__note">{entry.note}</span>}
              onOpen={() => go("place", place.id)}
            />
          </li>
        );
      })}
    </ul>
  );
}

function EmptyRecords({ isOwn }: { isOwn: boolean }) {
  return (
    <EmptyState
      icon="fork"
      title={isOwn ? "아직 남긴 기록이 없어요" : "아직 공개한 기록이 없어요"}
      message={isOwn ? "다녀온 맛집을 기록하면 여기 지도와 목록에 모여요." : "새 기록을 남기면 구독자에게 알려 드려요."}
      action={isOwn ? { label: "기록 남기기", onClick: () => go("register"), variant: "primary" } : undefined}
      className="r-card"
    />
  );
}
