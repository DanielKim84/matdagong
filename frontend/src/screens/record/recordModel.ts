import type { FoodFocus } from "../../models/community";
import { VISIT_RADIUS_METERS, type Place, type Taster } from "../../models/place";
import { formatNumber } from "../../utils/format";

/** 기록하기(RecordFlow) 단계·입력 한도와 입력 값 변환입니다. 단계 컴포넌트와 입력 훅이 함께 씁니다. */

// 직접 방문한 장소만 기록하도록 현재 위치 VISIT_RADIUS_METERS(1km) 안의 장소만 검색·선택할 수 있습니다.
export const NEARBY_RADIUS_METERS = VISIT_RADIUS_METERS;
export const MAX_PHOTOS = 10;
export const MAX_MENUS = 5;
export const MENU_NAME_MAX = 30;
export const HEADLINE_MAX = 60;
export const REASON_MIN = 5;
export const REASON_MAX = 500;

export type RecordStep = "place" | "media" | "taste" | "story" | "review";
export type FoodKind = "RESTAURANT" | "CAFE_DESSERT";
export type MenuRow = { name: string; price: string; photo?: string };

export const NEW_RECORD_STEPS: RecordStep[] = ["place", "media", "taste", "story", "review"];
export const EDIT_RECORD_STEPS: RecordStep[] = ["media", "taste", "story", "review"];
/** 저장하기 전에 다시 검사하는 단계(확인 단계는 입력이 없음) */
export const VALIDATED_STEPS: RecordStep[] = ["place", "media", "taste", "story"];

export function emptyMenu(): MenuRow {
  return { name: "", price: "" };
}

/** 추천 이유는 한 필드로 저장합니다. 첫 줄을 한 줄 추천, 나머지를 자세한 이야기로 나눠 보여 줍니다. */
export function splitReason(reason: string): { headline: string; detail: string } {
  const [first = "", ...rest] = reason.split("\n");
  if (first.length > HEADLINE_MAX) return { headline: "", detail: reason };
  return { headline: first, detail: rest.join("\n").replace(/^\n+/, "") };
}

/** 확인·완료 화면에 크게 보여 줄 한 줄 추천입니다. 한 줄 추천이 비었으면 추천 이유의 첫 줄을 씁니다. */
export function summaryHeadline(headline: string, reason: string): string {
  return headline.trim() || reason.split("\n")[0] || "";
}

export function joinReason(headline: string, detail: string): string {
  return [headline.trim(), detail.trim()].filter(Boolean).join("\n");
}

/** 가격 입력 칸에 천 단위 구분을 보여 줍니다. 저장할 때 콤마를 지워 숫자로 바꿉니다. */
export function formatPriceInput(value: string): string {
  return value.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** 수정할 기록의 추천 메뉴를 입력 줄로 바꿉니다. 메뉴가 없으면 빈 줄 하나입니다. */
export function menuRowsFromRecord(record?: Taster): MenuRow[] {
  const rows = (record?.menus ?? []).map((menu) =>
    typeof menu === "string"
      ? { name: menu, price: "" }
      : { name: menu.name, price: menu.price != null ? formatNumber(menu.price) : "", photo: menu.photo },
  );
  return rows.length ? rows : [emptyMenu()];
}

export function initialFoodKind(category: string | undefined, defaultFocus: FoodFocus): FoodKind {
  return category?.includes("카페") || category?.includes("디저트") || defaultFocus === "CAFE_DESSERT"
    ? "CAFE_DESSERT"
    : "RESTAURANT";
}

/** 맛다공 장소가 고른 카카오 장소와 같은 곳인지 확인합니다(제공처가 비어 있으면 카카오). */
export function isSameKakaoPlace(place: Place, kakaoPlaceId: string): boolean {
  return (place.providerCode ?? "KAKAO") === "KAKAO" && place.providerPlaceId === kakaoPlaceId;
}
