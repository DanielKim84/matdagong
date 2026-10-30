import { useEffect, useRef } from "react";
import type { Place } from "../../models/place";
import { go } from "../../app/navigation";
import { PlaceThumb, TasterLine } from "./DiscoverParts";
import { categoryLabel, distanceTo, formatDistance, leadTaster, placePhoto, type PlaceContext } from "./discoverModel";

/**
 * 지도 아래에서 가로로 넘기는 장소 카드입니다. 카드를 넘겨 멈춘 카드가 선택되고(지도 핀 강조),
 * 지도에서 핀을 고르면 그 카드로 넘어갑니다. 카드를 누르면 맛집 상세로 갑니다.
 */
export default function PlaceCarousel({
  places,
  ctx,
  focusedId,
  onFocus,
  photoFor,
}: {
  places: Place[];
  ctx: PlaceContext;
  focusedId: string | null;
  onFocus: (placeId: string) => void;
  photoFor: (placeId: string) => string | undefined;
}) {
  const list = useRef<HTMLUListElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const focusCallback = useRef(onFocus);
  focusCallback.current = onFocus;

  // 넘기기가 멈추면 왼쪽 정렬 위치에 가장 가까운 카드를 선택합니다.
  function handleScroll() {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const element = list.current;
      if (!element) return;
      const cards = [...element.querySelectorAll<HTMLElement>("[data-place-id]")];
      if (!cards.length) return;
      const padding = parseFloat(getComputedStyle(element).scrollPaddingLeft) || 0;
      const atEnd = element.scrollLeft >= element.scrollWidth - element.clientWidth - 2;
      const nearest = atEnd
        ? cards[cards.length - 1]
        : cards.reduce((best, card) =>
          Math.abs(card.offsetLeft - padding - element.scrollLeft) < Math.abs(best.offsetLeft - padding - element.scrollLeft) ? card : best);
      const id = nearest.dataset.placeId;
      if (id) focusCallback.current(id);
    }, 140);
  }
  useEffect(() => () => window.clearTimeout(settle.current), []);

  // 지도 핀으로 고른 장소는 해당 카드로 넘깁니다.
  useEffect(() => {
    const element = list.current;
    if (!element || !focusedId) return;
    const card = [...element.querySelectorAll<HTMLElement>("[data-place-id]")].find((item) => item.dataset.placeId === focusedId);
    if (!card) return;
    const padding = parseFloat(getComputedStyle(element).scrollPaddingLeft) || 0;
    const target = Math.min(card.offsetLeft - padding, element.scrollWidth - element.clientWidth);
    if (Math.abs(element.scrollLeft - target) < 4) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: target, behavior: reduce ? "auto" : "smooth" });
  }, [focusedId]);

  return (
    <ul className="r-discover-carousel" ref={list} onScroll={handleScroll} aria-label="지도 주변 맛집 카드">
      {places.map((place) => {
        const lead = leadTaster(place, ctx);
        const meta = [categoryLabel(place), formatDistance(distanceTo(place, ctx))].filter(Boolean).join(" · ");
        const note = lead?.note?.trim() || place.recentNote?.trim();
        const focused = place.id === focusedId;
        return (
          <li key={place.id} data-place-id={place.id}>
            <button
              type="button"
              className={`r-discover-card ${focused ? "is-focused" : ""}`}
              aria-current={focused ? "true" : undefined}
              onClick={() => go("place", place.id)}
            >
              <PlaceThumb place={place} photo={placePhoto(place, lead, photoFor(place.id))} />
              <span className="r-discover-card__copy">
                <b className="r-discover-card__name">{place.name}</b>
                <small className="r-muted">{meta}</small>
                <TasterLine taster={lead} ctx={ctx} />
                {note && <q className="r-discover-card__note">{note}</q>}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
