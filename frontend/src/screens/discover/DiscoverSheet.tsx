import { useRef, type PointerEvent, type ReactNode } from "react";
import type { Place, Taster } from "../../models/place";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { relativeTime } from "../../components/ui";
import { PlaceThumb, TasterLine } from "./DiscoverParts";
import {
  categoryLabel,
  distanceTo,
  formatDistance,
  isMine,
  leadTaster,
  placePhoto,
  uniqueTasters,
  type PlaceContext,
  type SheetState,
  type SortOrder,
} from "./discoverModel";

const ORDER: SheetState[] = ["peek", "half", "full"];
const STATE_LABEL: Record<SheetState, string> = { peek: "접힘", half: "중간", full: "펼침" };

type Props = {
  state: SheetState;
  onStateChange: (state: SheetState) => void;
  /** 접힘·중간·펼침 높이(px). 끌기를 놓았을 때 가까운 높이로 맞춥니다. */
  heights: Record<SheetState, number>;
  title: string;
  sort: SortOrder;
  canSortByDistance: boolean;
  onSortChange: (sort: SortOrder) => void;
  places: Place[];
  recentSubscribed: { place: Place; taster: Taster }[];
  nearby: Place[];
  ctx: PlaceContext;
  likedIds: string[];
  onToggleLike: (placeId: string) => void;
  photoFor: (placeId: string) => string | undefined;
  loading: boolean;
  /** 오류·빈 화면 등 목록 대신 보여 줄 내용 */
  fallback?: ReactNode;
};

/** 아래에서 끌어 올리는 목록 시트입니다. 손잡이를 누르거나 끌어 접힘 → 중간 → 펼침으로 바꿉니다. */
export default function DiscoverSheet({
  state,
  onStateChange,
  heights,
  title,
  sort,
  canSortByDistance,
  onSortChange,
  places,
  recentSubscribed,
  nearby,
  ctx,
  likedIds,
  onToggleLike,
  photoFor,
  loading,
  fallback,
}: Props) {
  const sheet = useRef<HTMLElement>(null);
  const drag = useRef<{ startY: number; startHeight: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);

  function startDrag(event: PointerEvent<HTMLElement>) {
    if ((event.target as HTMLElement).closest(".r-discover-sheet__sort")) return;
    const element = sheet.current;
    if (!element) return;
    drag.current = { startY: event.clientY, startHeight: element.getBoundingClientRect().height, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLElement>) {
    const current = drag.current, element = sheet.current;
    if (!current || !element) return;
    const delta = event.clientY - current.startY;
    if (!current.moved && Math.abs(delta) < 6) return;
    current.moved = true;
    element.classList.add("is-dragging");
    const next = Math.min(heights.full, Math.max(heights.peek, current.startHeight - delta));
    element.style.height = `${next}px`;
  }
  function endDrag(event: PointerEvent<HTMLElement>) {
    const current = drag.current, element = sheet.current;
    drag.current = null;
    if (!current || !element || !current.moved) return;
    suppressClick.current = true;
    const delta = event.clientY - current.startY;
    const finalHeight = element.getBoundingClientRect().height;
    element.classList.remove("is-dragging");
    element.style.removeProperty("height");
    // 가장 가까운 높이로 맞추되, 충분히 끌었으면 끈 방향으로 한 단계는 움직입니다.
    let next = ORDER.reduce((best, item) =>
      Math.abs(heights[item] - finalHeight) < Math.abs(heights[best] - finalHeight) ? item : best);
    const index = ORDER.indexOf(state);
    if (next === state && Math.abs(delta) > 40) next = ORDER[Math.min(ORDER.length - 1, Math.max(0, index + (delta < 0 ? 1 : -1)))];
    onStateChange(next);
  }
  function cancelDrag() {
    drag.current = null;
    sheet.current?.classList.remove("is-dragging");
    sheet.current?.style.removeProperty("height");
  }
  function cycle() {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    onStateChange(state === "peek" ? "half" : state === "half" ? "full" : "peek");
  }

  const nextSort: SortOrder = sort === "priority" && canSortByDistance ? "distance" : "priority";
  return (
    <section ref={sheet} className="r-discover-sheet" aria-label="맛객 기록 목록">
      <div
        className="r-discover-sheet__head"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
      >
        <button
          type="button"
          className="r-discover-sheet__grab"
          aria-expanded={state !== "peek"}
          aria-label={`목록 크기 바꾸기, 지금 ${STATE_LABEL[state]}`}
          onClick={cycle}
        >
          <i aria-hidden="true" />
        </button>
        <div className="r-discover-sheet__title">
          <h2>{title}</h2>
          <button
            type="button"
            className="r-discover-sheet__sort"
            onClick={() => onSortChange(nextSort)}
            disabled={!canSortByDistance && sort === "priority"}
            aria-label={`정렬: ${sort === "distance" ? "가까운 순" : "구독 먼저"}${canSortByDistance ? ", 눌러서 바꾸기" : ""}`}
          >
            {sort === "distance" ? "가까운 순" : "구독 먼저"}
            {canSortByDistance && <Icon name="list" />}
          </button>
        </div>
      </div>

      <div className="r-discover-sheet__body" inert={state === "peek"}>
        {fallback ?? (
          <>
            {recentSubscribed.length > 0 && (
              <section className="r-discover-section">
                <div className="r-section-head">
                  <h2>구독한 맛객의 최근 기록</h2>
                  <button type="button" onClick={() => go("subscriptions")}>구독 관리</button>
                </div>
                <ul className="r-discover-strip">
                  {recentSubscribed.map(({ place, taster }) => (
                    <li key={`${place.id}-${taster.tasterId}`}>
                      <button type="button" className="r-discover-mini" onClick={() => go("place", place.id)}>
                        <PlaceThumb place={place} photo={placePhoto(place, taster, photoFor(place.id))} />
                        <span className="r-discover-mini__who">
                          <TasterLine taster={taster} ctx={{ ...ctx, subscriptions: new Set() }} />
                          {relativeTime(taster.recordedAt) && <small className="r-muted">{relativeTime(taster.recordedAt)}</small>}
                        </span>
                        <b>{place.name}</b>
                        {taster.note && <q>{taster.note}</q>}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {nearby.length > 0 && (
              <section className="r-discover-section">
                <div className="r-section-head">
                  <h2>내 주변 추천</h2>
                </div>
                <p className="r-discover-section__hint">취향이 맞는 맛객이 1km 안에서 기록한 곳이에요.</p>
                <ul className="r-discover-strip">
                  {nearby.map((place) => {
                    const lead = leadTaster(place, ctx);
                    return (
                      <li key={place.id}>
                        <button type="button" className="r-discover-mini" onClick={() => go("place", place.id)}>
                          <PlaceThumb place={place} photo={placePhoto(place, lead, photoFor(place.id))} />
                          <b>{place.name}</b>
                          <small className="r-muted">{[categoryLabel(place), formatDistance(distanceTo(place, ctx))].filter(Boolean).join(" · ")}</small>
                          <TasterLine taster={lead} ctx={ctx} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {(recentSubscribed.length > 0 || nearby.length > 0) && (
              <div className="r-section-head r-discover-section__list-head">
                <h2>지도에 보이는 곳</h2>
              </div>
            )}

            {loading && !places.length ? (
              <div className="r-discover-rows" aria-busy="true" aria-label="맛집을 불러오는 중">
                {[0, 1, 2].map((item) => <div key={item} className="r-discover-row r-discover-row--skeleton" />)}
              </div>
            ) : places.length ? (
              <ul className="r-discover-rows">
                {places.map((place) => {
                  const lead = leadTaster(place, ctx);
                  const tasters = uniqueTasters(place);
                  const liked = likedIds.includes(place.id);
                  const mine = place.tasters.some(isMine);
                  return (
                    <li key={place.id} className="r-discover-row">
                      <button type="button" className="r-discover-row__main" onClick={() => go("place", place.id)}>
                        <PlaceThumb place={place} photo={placePhoto(place, lead, photoFor(place.id))} />
                        <span className="r-discover-row__copy">
                          <b>{place.name}</b>
                          <small className="r-muted">{[categoryLabel(place), formatDistance(distanceTo(place, ctx))].filter(Boolean).join(" · ")}</small>
                          <TasterLine taster={lead} ctx={ctx} others={Math.max(0, tasters.length - 1)} stack={tasters} />
                        </span>
                      </button>
                      {mine ? (
                        <span className="r-tag r-discover-row__mine">내 기록</span>
                      ) : (
                        <button
                          type="button"
                          className={`r-discover-row__save ${liked ? "is-on" : ""}`}
                          aria-pressed={liked}
                          aria-label={liked ? `${place.name} 내 맛집에서 빼기` : `${place.name} 내 맛집에 저장`}
                          onClick={() => onToggleLike(place.id)}
                        >
                          <Icon name="heart" filled={liked} />
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="r-empty">
                <b>지도에 보이는 곳에 기록이 없어요</b>
                <p>지도를 옮기거나 줄여서 더 넓게 찾아보세요.</p>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
