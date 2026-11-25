import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import PlaceCard from "../../components/PlaceCard";
import { EmptyState, Skeleton } from "../../components/ui";
import { placePhoto, type Place } from "../../models/place";
import { placeSummary, type PlaceContext } from "../discover/discoverModel";
import PlaceQuote from "../discover/PlaceQuote";
import { MY_PLACE_CATEGORY_LABELS, myLeadTaster, type MyPlaceCategory } from "./myMapModel";

/**
 * 내 지도 카드 아래 목록: 지금 지도에 보이는 내 맛집을 한 줄씩 보여 줍니다(발견 목록과 같은 PlaceCard·한마디).
 * 가볼 곳은 오른쪽 하트로 바로 풀 수 있고(하트를 풀 때 고르는 시트가 열림), 가본 곳·공유 중은 하트 대신 같은 색 이름표를 붙입니다
 * (마커·아래 수와 같은 색: 가본 곳 --visited-*, 공유 중 --shared-*).
 */
export default function MyMapPlaceList({
  places,
  categories,
  ctx,
  focusedId = null,
  onOpen,
}: {
  places: Place[];
  categories: Map<string, MyPlaceCategory>;
  ctx: PlaceContext;
  focusedId?: string | null;
  onOpen: (place: Place) => void;
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
        const category = categories.get(place.id) ?? "wish";
        return (
          <li key={place.id} className={focusedId === place.id ? "is-focused" : ""}>
            <PlaceCard
              place={place}
              photo={placePhoto(place, lead, photoFor(place.id))}
              meta={placeSummary(place, ctx)}
              detail={<PlaceQuote taster={lead} />}
              onOpen={() => onOpen(place)}
              trailing={
                category === "wish" ? (
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
                  <span className={`r-tag r-mymap-tag is-${category} r-discover-row__mine`}>
                    {MY_PLACE_CATEGORY_LABELS[category]}
                  </span>
                )
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
