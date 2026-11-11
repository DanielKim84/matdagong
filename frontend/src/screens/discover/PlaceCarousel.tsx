import { useEffect, useRef } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import PlaceThumb from "../../components/PlaceThumb";
import { placePhoto, type Place, type Taster } from "../../models/place";
import { leadTaster, placeSummary, type PlaceContext } from "./discoverModel";
import TasterLine from "./TasterLine";

/** 넘기기가 이만큼 멈춰 있으면 끝난 것으로 봅니다(ms). */
const SETTLE_DELAY_MS = 140;
/** 소수점 스크롤 값 때문에 끝까지 넘겨도 몇 px 모자랄 수 있어, 이만큼 안이면 마지막 카드로 봅니다(px). */
const END_TOLERANCE_PX = 2;
/** 이미 이만큼 가까이 있으면 다시 넘기지 않습니다(px). */
const SCROLL_TOLERANCE_PX = 4;

function cardElements(list: HTMLElement): HTMLElement[] {
  return [...list.querySelectorAll<HTMLElement>("[data-place-id]")];
}

/** 카드를 왼쪽에 맞춰 멈추는 기준(CSS scroll-padding-left) */
function scrollPaddingLeft(list: HTMLElement): number {
  return parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
}

/**
 * 지도 아래에서 가로로 넘기는 장소 카드입니다. 카드를 넘겨 멈춘 카드가 선택되고(지도 핀 강조),
 * 지도에서 핀을 고르면 그 카드로 넘어갑니다. 카드를 누르면 맛집 상세로 갑니다.
 * 발견과 내 지도가 함께 씁니다. 내 지도는 leadOf로 내 기록을 대표로 고르고, badgeOf로 사진 위에 나와의 관계(내 기록·다녀온 곳·가볼 곳)를 붙입니다.
 */
export default function PlaceCarousel({
  places,
  ctx,
  focusedId,
  onFocus,
  leadOf = leadTaster,
  badgeOf,
}: {
  places: Place[];
  ctx: PlaceContext;
  focusedId: string | null;
  onFocus: (placeId: string) => void;
  /** 카드에 보여 줄 대표 맛객(기본: 발견의 대표 맛객 고르기) */
  leadOf?: (place: Place, ctx: PlaceContext) => Taster | undefined;
  /** 사진 왼쪽 위에 붙일 이름표 */
  badgeOf?: (place: Place) => string | undefined;
}) {
  const { photoFor } = useAppData();
  const list = useRef<HTMLUListElement>(null);
  const settle = useRef<number | undefined>(undefined);
  const focusCallback = useRef(onFocus);
  focusCallback.current = onFocus;

  // 넘기기가 멈추면 왼쪽 정렬 위치에 가장 가까운 카드를 선택합니다.
  function selectSettledCard() {
    window.clearTimeout(settle.current);
    settle.current = window.setTimeout(() => {
      const element = list.current;
      if (!element) return;
      const cards = cardElements(element);
      if (!cards.length) return;
      const padding = scrollPaddingLeft(element);
      const isAtEnd = element.scrollLeft >= element.scrollWidth - element.clientWidth - END_TOLERANCE_PX;
      const nearest = isAtEnd
        ? cards[cards.length - 1]
        : cards.reduce((best, card) =>
            Math.abs(card.offsetLeft - padding - element.scrollLeft) <
            Math.abs(best.offsetLeft - padding - element.scrollLeft)
              ? card
              : best,
          );
      const id = nearest.dataset.placeId;
      if (id) focusCallback.current(id);
    }, SETTLE_DELAY_MS);
  }
  useEffect(() => () => window.clearTimeout(settle.current), []);

  // 지도 핀으로 고른 장소는 해당 카드로 넘깁니다.
  useEffect(() => {
    const element = list.current;
    if (!element || !focusedId) return;
    const card = cardElements(element).find((item) => item.dataset.placeId === focusedId);
    if (!card) return;
    const target = Math.min(card.offsetLeft - scrollPaddingLeft(element), element.scrollWidth - element.clientWidth);
    if (Math.abs(element.scrollLeft - target) < SCROLL_TOLERANCE_PX) return;
    const shouldReduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: target, behavior: shouldReduceMotion ? "auto" : "smooth" });
  }, [focusedId]);

  return (
    <ul className="r-discover-carousel" ref={list} onScroll={selectSettledCard} aria-label="지도 주변 맛집 카드">
      {places.map((place) => {
        const lead = leadOf(place, ctx);
        const badge = badgeOf?.(place);
        const note = lead?.note?.trim() || place.recentNote?.trim();
        const isFocused = place.id === focusedId;
        return (
          <li key={place.id} data-place-id={place.id}>
            <button
              type="button"
              className={`r-discover-card ${isFocused ? "is-focused" : ""}`}
              aria-current={isFocused ? "true" : undefined}
              onClick={() => go("place", place.id)}
            >
              <PlaceThumb
                place={place}
                photo={placePhoto(place, lead, photoFor(place.id))}
                fallback="icon"
                className="r-discover-card__thumb"
              />
              {badge && <span className="r-tag r-tag--mine r-discover-card__badge">{badge}</span>}
              <span className="r-discover-card__copy">
                <b className="r-discover-card__name">{place.name}</b>
                <small className="r-muted">{placeSummary(place, ctx)}</small>
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
