import type { TasteTag } from "../../models/community";
import { isMyTaster, type Place, type RecommendedMenu, type Taster } from "../../models/place";
import { groupTagsByDictionary, isTasteTagGroup, type TagGroupSection } from "../../models/tasteTags";
import { compareByTrust, isTrustedTaster, tasteScoreLabel } from "../../models/trust";
import { formatWon } from "../../utils/format";

/** 맛집 상세(PlaceDetailScreen)와 그 하위 부품이 쓰는 맛객 기록 정렬·표시·사진 모으기 계산입니다. */

/** 맛집 상세에서 다루는 맛객 기록 한 건입니다. 내 기록은 tasterId가 MY_TASTER_ID입니다. */
export type PlaceRecord = Taster;

/** 사진 보기에 넘기는 사진 한 장. 누가 찍은 어떤 메뉴인지 함께 보여 줍니다. */
export type PlacePhoto = {
  src: string;
  record: PlaceRecord;
  /** 메뉴 사진이면 "메뉴명 · 가격" */
  caption?: string;
  /** 메뉴에 붙은 사진인지(대표·배경 사진과 구분) */
  isMenu?: boolean;
  /** 메뉴 사진이면 메뉴 이름과 가격(사진 크게 보기에서 크게 보여 줌) */
  menuName?: string;
  menuPrice?: number;
};

export function recordMenus(record: PlaceRecord): RecommendedMenu[] {
  return (record.menus ?? []).filter((menu) => menu.name?.trim());
}

/**
 * 한 맛객의 취향 태그와 매장 이용 정보를 사전의 분류 순서대로 묶습니다(매장 이용은 취향 태그 뒤).
 * 분류는 기록에 저장된 값을 먼저 쓰고, 없으면 태그 사전에서 찾습니다. 둘 다 모르는 옛 태그는 "기타"로 둡니다.
 */
export function recordTagGroups(record: PlaceRecord, dictionary: TasteTag[]): TagGroupSection[] {
  const visitConditions: string[] = record.visitConditions ?? [];
  return groupTagsByDictionary([...(record.tags ?? []), ...visitConditions], (tag) => {
    if (visitConditions.includes(tag)) return "VISIT";
    const saved = record.tagGroups?.[tag];
    if (isTasteTagGroup(saved) && saved !== "VISIT") return saved;
    return dictionary.find((item) => item.name === tag)?.tagGroup;
  });
}

/**
 * 장소의 맛객 기록을 정렬합니다.
 * 내 기록 → 구독 중인 맛객 → 신뢰·취향 점수(compareByTrust) → 구독자 수 → 이름 순입니다.
 */
export function placeRecords(place: Place, subscribedIds: string[]): PlaceRecord[] {
  const rank = (record: PlaceRecord) => (isMyTaster(record) ? 2 : subscribedIds.includes(record.tasterId) ? 1 : 0);
  return [...place.tasters].sort(
    (left, right) =>
      rank(right) - rank(left) ||
      compareByTrust(left, right) ||
      (right.subscriberCount ?? 0) - (left.subscriberCount ?? 0) ||
      left.tasterName.localeCompare(right.tasterName, "ko"),
  );
}

/**
 * 맛객 고르기 줄과 전체 목록에서 이름 아래 붙이는 짧은 표시입니다.
 * 믿고 가는 맛객이면 구독 여부보다 신뢰 등급을 먼저 보여 줍니다(어떤 맛객의 기록을 믿을지 고르는 화면이라서).
 */
export function recordBadge(record: PlaceRecord, subscribedIds: string[]): string {
  if (isMyTaster(record)) return "내 기록";
  if (isTrustedTaster(record)) return tasteScoreLabel(record);
  if (subscribedIds.includes(record.tasterId)) return "구독 중";
  return tasteScoreLabel(record);
}

/** 서명 주소의 쿼리·해시를 떼어 같은 사진인지 비교할 열쇠로 씁니다. */
function photoKey(src: string): string {
  return src.split(/[?#]/, 1)[0];
}

/** 고른 맛객 기록의 사진과 메뉴 사진을 한 줄로 모읍니다. 같은 주소의 사진은 한 번만 넣습니다. */
export function collectPhotos(record: PlaceRecord): PlacePhoto[] {
  const seen = new Set<string>();
  const photos: PlacePhoto[] = [];
  const add = (photo: PlacePhoto) => {
    const key = photoKey(photo.src);
    if (!photo.src || seen.has(key)) return;
    seen.add(key);
    photos.push(photo);
  };
  (record.photos ?? []).forEach((src) => add({ src, record }));
  recordMenus(record).forEach((menu) => {
    if (menu.photo)
      add({
        src: menu.photo,
        record,
        isMenu: true,
        menuName: menu.name,
        menuPrice: menu.price,
        caption: [menu.name, formatWon(menu.price)].filter(Boolean).join(" · "),
      });
  });
  return photos;
}

/** 서명 주소의 쿼리를 빼고 비교해 사진 보기에서 몇 번째 사진인지 찾습니다. 없으면 -1입니다. */
export function photoIndexOf(photos: PlacePhoto[], src?: string): number {
  if (!src) return -1;
  const key = photoKey(src);
  return photos.findIndex((photo) => photoKey(photo.src) === key);
}

/** 위도·경도가 숫자이고 (0, 0)이 아닌지 봅니다. 좌표가 비어 0으로 온 장소는 지도에 그리지 않습니다. */
export function hasCoordinates(place: Pick<Place, "latitude" | "longitude">): boolean {
  return (
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude) &&
    !(place.latitude === 0 && place.longitude === 0)
  );
}
