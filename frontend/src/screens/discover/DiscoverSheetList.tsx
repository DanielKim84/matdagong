import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import PlaceCard from "../../components/PlaceCard";
import PlaceThumb from "../../components/PlaceThumb";
import { EmptyState, SectionHead, Skeleton } from "../../components/ui";
import { isMyTaster, placePhoto, type Place, type Taster } from "../../models/place";
import { formatRelativeTime } from "../../utils/format";
import { leadTaster, placeSummary, uniqueTasters, type PlaceContext } from "./discoverModel";
import TasterLine from "./TasterLine";

/** 목록 시트 본문: 이 지역 구독 맛객 기록(최근 순), 지도에 보이는 곳. 둘 다 지금 지도에 보이는 지역 기준입니다. */
export default function DiscoverSheetList({
  places,
  recentSubscribed,
  ctx,
}: {
  places: Place[];
  recentSubscribed: { place: Place; taster: Taster }[];
  ctx: PlaceContext;
}) {
  const { likedPlaceIds, isLoading, photoFor, actions } = useAppData();
  // 최근 기록 칸은 모두 구독한 맛객이라 "구독 중" 표시는 뺍니다.
  const recentContext = { ...ctx, subscriptions: new Set<string>() };

  return (
    <>
      {recentSubscribed.length > 0 && (
        <section className="r-discover-section">
          <SectionHead title="이 지역 구독 맛객 기록" action="구독 관리" onAction={() => go("subscriptions")} />
          <p className="r-discover-section__hint">구독한 맛객이 이 지역에 올린 곳을 최근 순으로 보여 줘요.</p>
          <ul className="r-discover-strip">
            {recentSubscribed.map(({ place, taster }) => {
              const recordedTime = formatRelativeTime(taster.recordedAt);
              return (
                <li key={`${place.id}-${taster.tasterId}`}>
                  <button type="button" className="r-discover-mini" onClick={() => go("place", place.id)}>
                    <PlaceThumb
                      place={place}
                      photo={placePhoto(place, taster, photoFor(place.id))}
                      fallback="icon"
                      className="r-discover-mini__thumb"
                    />
                    <span className="r-discover-mini__who">
                      <TasterLine taster={taster} ctx={recentContext} />
                      {recordedTime && <small className="r-muted">{recordedTime}</small>}
                    </span>
                    <b>{place.name}</b>
                    {taster.note && <q>{taster.note}</q>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recentSubscribed.length > 0 && (
        <SectionHead title="지도에 보이는 곳" className="r-discover-section__list-head" />
      )}

      {isLoading && !places.length ? (
        <Skeleton shape="row" count={3} label="맛집을 불러오는 중" className="r-discover-rows-skeleton" />
      ) : places.length ? (
        <ul className="r-place-cards">
          {places.map((place) => {
            const lead = leadTaster(place, ctx);
            const tasters = uniqueTasters(place);
            const isLiked = likedPlaceIds.includes(place.id);
            const hasMyRecord = place.tasters.some(isMyTaster);
            return (
              <li key={place.id}>
                <PlaceCard
                  place={place}
                  photo={placePhoto(place, lead, photoFor(place.id))}
                  meta={placeSummary(place, ctx)}
                  detail={
                    <TasterLine taster={lead} ctx={ctx} others={Math.max(0, tasters.length - 1)} stack={tasters} />
                  }
                  onOpen={() => go("place", place.id)}
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
        <EmptyState title="지도에 보이는 곳에 기록이 없어요" message="지도를 옮기거나 줄여서 더 넓게 찾아보세요." />
      )}
    </>
  );
}
