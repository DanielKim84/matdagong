import {
  isMyTaster,
  MY_TASTER_ID,
  type NewPlace,
  type Place,
  type RecommendedMenu,
  type Taster,
} from "../../models/place";
import { formatWon } from "../../utils/format";

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
  return (record.menus ?? [])
    .map((menu) => (typeof menu === "string" ? { name: menu } : menu))
    .filter((menu) => menu.name?.trim());
}

/**
 * 장소의 맛객 기록에 이 브라우저에만 남은 이전 내 기록을 더하고 정렬합니다.
 * 내 기록 → 구독 중인 맛객 → 취향 점수 → 구독자 수 → 이름 순입니다.
 */
export function placeRecords(
  place: Place,
  legacyOwnRecord: NewPlace | undefined,
  subscribedIds: string[],
): PlaceRecord[] {
  const records: PlaceRecord[] =
    legacyOwnRecord && !place.tasters.some(isMyTaster)
      ? [
          ...place.tasters,
          {
            tasterId: MY_TASTER_ID,
            tasterName: "내 기록",
            tag: "내 맛집",
            avatar: "",
            avatarVariant: 1,
            note: legacyOwnRecord.reason,
            menus: legacyOwnRecord.menus,
            photos: legacyOwnRecord.photos,
            tags: legacyOwnRecord.tags,
            tagGroups: legacyOwnRecord.tagGroups,
            visitConditions: legacyOwnRecord.visitConditions,
            placeCount: 1,
            recordedAt: legacyOwnRecord.createdAt,
          },
        ]
      : place.tasters;
  const rank = (record: PlaceRecord) => (isMyTaster(record) ? 2 : subscribedIds.includes(record.tasterId) ? 1 : 0);
  return [...records].sort(
    (left, right) =>
      rank(right) - rank(left) ||
      (right.matchScore ?? 0) - (left.matchScore ?? 0) ||
      (right.subscriberCount ?? 0) - (left.subscriberCount ?? 0) ||
      left.tasterName.localeCompare(right.tasterName, "ko"),
  );
}

/** 기록(보통 고른 맛객 한 명)의 사진과 메뉴 사진을 한 줄로 모읍니다. 같은 주소의 사진은 한 번만 넣습니다. */
export function collectPhotos(records: PlaceRecord[]): PlacePhoto[] {
  const seen = new Set<string>();
  const photos: PlacePhoto[] = [];
  const add = (photo: PlacePhoto) => {
    const key = photo.src.split(/[?#]/, 1)[0];
    if (!photo.src || seen.has(key)) return;
    seen.add(key);
    photos.push(photo);
  };
  records.forEach((record) => {
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
  });
  return photos;
}

export function photoIndexOf(photos: PlacePhoto[], src?: string): number {
  if (!src) return -1;
  const key = src.split(/[?#]/, 1)[0];
  return photos.findIndex((photo) => photo.src.split(/[?#]/, 1)[0] === key);
}

export function hasCoordinates(place: Pick<Place, "latitude" | "longitude">): boolean {
  return (
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude) &&
    !(place.latitude === 0 && place.longitude === 0)
  );
}
