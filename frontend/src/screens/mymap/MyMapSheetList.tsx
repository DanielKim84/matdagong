import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import PlaceCard from "../../components/PlaceCard";
import { EmptyState, Skeleton } from "../../components/ui";
import { placePhoto, type Place } from "../../models/place";
import { placeSummary, type PlaceContext } from "../discover/discoverModel";
import TasterLine from "../discover/TasterLine";
import { MY_MAP_KIND_LABELS, myLeadTaster, type MyMapKind } from "./myMapModel";

/**
 * 내 지도 목록 시트 본문: 지금 지도에 보이는 내 맛집을 한 줄씩 보여 줍니다(발견 목록과 같은 PlaceCard).
 * 가볼 곳은 오른쪽 하트로 바로 풀 수 있고(하트를 풀 때 고르는 시트가 열림), 내 기록·다녀온 곳은 하트 대신 이름표를 붙입니다.
 */
export default function MyMapSheetList({
  places,
  kinds,
  ctx,
}: {
  places: Place[];
  kinds: Map<string, MyMapKind>;
  ctx: PlaceContext;
}) {
  const { isLoading, photoFor, actions } = useAppData();

  if (isLoading && !places.length) {
    return <Skeleton shape="row" count={3} label="내 맛집을 불러오는 중" className="r-discover-rows-skeleton" />;
  }
  if (!places.length) {
    return (
      <EmptyState title="지도에 보이는 곳에 내 맛집이 없어요" message="지도를 옮기거나 줄여서 더 넓게 찾아보세요." />
    );
  }
  return (
    <ul className="r-place-cards">
      {places.map((place) => {
        const lead = myLeadTaster(place, ctx);
        const kind = kinds.get(place.id) ?? "liked";
        return (
          <li key={place.id}>
            <PlaceCard
              place={place}
              photo={placePhoto(place, lead, photoFor(place.id))}
              meta={placeSummary(place, ctx)}
              detail={<TasterLine taster={lead} ctx={ctx} />}
              onOpen={() => go("place", place.id)}
              trailing={
                kind === "liked" ? (
                  <button
                    type="button"
                    className="r-discover-row__save is-on"
                    aria-pressed="true"
                    aria-label={`${place.name} 하트 풀기`}
                    onClick={() => void actions.chooseLike(place.id)}
                  >
                    <Icon name="heart" filled />
                  </button>
                ) : (
                  <span className="r-tag r-tag--mine r-discover-row__mine">{MY_MAP_KIND_LABELS[kind]}</span>
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
