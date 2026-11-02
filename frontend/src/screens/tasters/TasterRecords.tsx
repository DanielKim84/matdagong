import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import MapCanvas from "../../components/MapCanvas";
import PlaceThumb from "../../components/PlaceThumb";
import { EmptyState } from "../../components/ui";
import { formatRelativeTime } from "../../utils/format";
import type { TasterRecord } from "./tasterData";

/** 맛객 프로필의 기록을 지도나 목록으로 보여 줍니다. 기록이 없으면 빈 화면 안내입니다. */
export default function TasterRecords({
  records,
  view,
  isOwn,
}: {
  records: TasterRecord[];
  view: "map" | "list";
  isOwn: boolean;
}) {
  const app = useAppData();
  if (!records.length) return <EmptyRecords isOwn={isOwn} />;
  if (view === "map") {
    return (
      <div className="r-tasters-map">
        <MapCanvas
          places={records.map((record) => record.place)}
          subscriptions={app.subscriptionIds}
          onSelect={(place) => go("place", place.id)}
          fitToPlaces
        />
      </div>
    );
  }
  return (
    <div className="r-tasters-records">
      {records.map(({ place, entry }) => {
        // 이 맛객의 기록 사진만 씁니다(placePhoto처럼 다른 맛객의 사진으로 넘어가지 않음). 내 프로필이면 내 사진까지.
        const photo = entry.photos?.[0] ?? (isOwn ? app.photoFor(place.id) : undefined);
        const when = formatRelativeTime(entry.recordedAt);
        return (
          <button type="button" className="r-row" key={place.id} onClick={() => go("place", place.id)}>
            <PlaceThumb place={place} photo={photo} />
            <span className="r-row__copy">
              <b>{place.name}</b>
              <small>{[place.category, when].filter(Boolean).join(" · ")}</small>
              {entry.note && <small className="r-tasters-records__note">{entry.note}</small>}
            </span>
            {isOwn && entry.visibility === "PRIVATE" && <span className="r-tag r-tag--neutral">비공개</span>}
          </button>
        );
      })}
    </div>
  );
}

function EmptyRecords({ isOwn }: { isOwn: boolean }) {
  return (
    <EmptyState
      icon="fork"
      title={isOwn ? "아직 남긴 기록이 없어요" : "아직 공개한 기록이 없어요"}
      message={isOwn ? "다녀온 맛집을 기록하면 여기 지도와 목록에 모여요." : "새 기록을 남기면 구독자에게 알려 드려요."}
      action={isOwn ? { label: "기록 남기기", onClick: () => go("register"), variant: "primary" } : undefined}
    />
  );
}
