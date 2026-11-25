import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import PlaceThumb from "../../components/PlaceThumb";
import { EmptyState } from "../../components/ui";
import type { TasterRecord } from "./tasterData";

/**
 * 맛객 프로필의 추천 맛집(보드 08-04): 사진 칸과 그 아래 가게 이름을 가로로 늘어놓고 옆으로 넘깁니다. 누르면 맛집 상세로 갑니다.
 * 이 맛객의 기록 사진만 씁니다(다른 맛객의 사진으로 넘어가지 않음). 내 프로필이면 내 사진까지, 나만 보기 기록에는 작은 표시를 붙입니다.
 */
export default function TasterRecords({ records, isOwn }: { records: TasterRecord[]; isOwn: boolean }) {
  const app = useAppData();
  if (!records.length) return <EmptyRecords isOwn={isOwn} />;
  return (
    <ul className="r-tasters-picks">
      {records.map(({ place, entry }) => {
        const photo = entry.photos?.[0] ?? (isOwn ? app.photoFor(place.id) : undefined);
        return (
          <li key={place.id}>
            <button type="button" onClick={() => go("place", place.id)} aria-label={`${place.name} 맛집 보기`}>
              <PlaceThumb place={place} photo={photo} fallback="icon" className="r-tasters-picks__photo" />
              <span>{place.name}</span>
              {isOwn && entry.visibility === "PRIVATE" && <small>나만 보기</small>}
            </button>
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
      message={isOwn ? "다녀온 맛집을 기록하면 여기에 모여요." : "새 기록을 남기면 구독자에게 알려 드려요."}
      action={isOwn ? { label: "기록 남기기", onClick: () => go("register"), variant: "primary" } : undefined}
      className="r-card"
    />
  );
}
