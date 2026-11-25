import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import PlaceCard from "../../components/PlaceCard";
import { EmptyState, Skeleton } from "../../components/ui";
import { isMyTaster, placePhoto, type Place } from "../../models/place";
import { leadTaster, placeSummary, type PlaceContext } from "./discoverModel";
import PlaceQuote from "./PlaceQuote";

/**
 * 발견 지도 카드 아래의 사진 목록입니다(보드 06-01). 지금 지도에 보이는 맛집을 사진 · 이름 · 분류·거리 · 대표 맛객 한마디로 보여 줍니다.
 * 맛객별 최신 기록은 피드에서 보고, 여기는 맛집 단위 목록에 집중합니다. 지도에서 고른 곳(focusedId)은 연한 코랄로 표시합니다.
 */
export default function DiscoverPlaceList({
  places,
  ctx,
  focusedId = null,
  onOpen,
}: {
  places: Place[];
  ctx: PlaceContext;
  focusedId?: string | null;
  onOpen: (place: Place) => void;
}) {
  const { likedPlaceIds, isLoading, photoFor, actions } = useAppData();

  return (
    <>
      {isLoading && !places.length ? (
        <Skeleton shape="row" count={3} label="맛집을 불러오는 중" className="r-discover-rows-skeleton" />
      ) : places.length ? (
        <ul className="r-place-cards">
          {places.map((place) => {
            const lead = leadTaster(place, ctx);
            const isLiked = likedPlaceIds.includes(place.id);
            const hasMyRecord = place.tasters.some(isMyTaster);
            return (
              <li key={place.id} className={focusedId === place.id ? "is-focused" : ""}>
                <PlaceCard
                  place={place}
                  photo={placePhoto(place, lead, photoFor(place.id))}
                  meta={placeSummary(place, ctx)}
                  detail={<PlaceQuote taster={lead} />}
                  onOpen={() => onOpen(place)}
                  trailing={
                    hasMyRecord ? (
                      <span className="r-tag r-tag--mine r-discover-row__mine">내 기록</span>
                    ) : (
                      <button
                        type="button"
                        className={`r-discover-row__save ${isLiked ? "is-on" : ""}`}
                        aria-pressed={isLiked}
                        aria-label={isLiked ? `${place.name} 하트 풀기` : `${place.name} 가볼 곳에 저장`}
                        onClick={() => void actions.chooseLike(place.id)}
                      >
                        <Icon name="heart" filled={isLiked} />
                      </button>
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState title="이 지역에는 맛집이 없어요" message="지도를 옮겨 다른 지역을 둘러보세요." />
      )}
    </>
  );
}
