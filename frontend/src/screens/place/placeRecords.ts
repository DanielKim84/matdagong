import type { NewPlace, Place, RecommendedMenu, Taster } from "../../models/place";
import { demoTasterAvatar } from "../../utils/profileMedia";

/** 맛집 상세에서 다루는 맛객 기록 한 건입니다. 내 기록은 tasterId가 "me"입니다. */
export type PlaceRecord = Taster;

/** 사진 보기에 넘기는 사진 한 장. 누가 찍은 어떤 메뉴인지 함께 보여 줍니다. */
export type PlacePhoto = {
  src: string;
  record: PlaceRecord;
  /** 메뉴 사진이면 "메뉴명 · 가격" */
  caption?: string;
};

export type MenuSummary = { name: string; price?: number; photo?: string; count: number };
export type CountSummary = { label: string; count: number };

export const MY_RECORD_ID = "me";

export function formatPrice(price?: number): string {
  return price != null && Number.isFinite(price) ? `${price.toLocaleString("ko-KR")}원` : "";
}

export function recordMenus(record: PlaceRecord): RecommendedMenu[] {
  return (record.menus ?? [])
    .map((menu) => typeof menu === "string" ? { name: menu } : menu)
    .filter((menu) => menu.name?.trim());
}

/**
 * 장소의 맛객 기록에 이 브라우저에만 남은 이전 내 기록을 더하고 정렬합니다.
 * 내 기록 → 구독 중인 맛객 → 취향 점수 → 구독자 수 → 이름 순입니다.
 */
export function placeRecords(place: Place, own: NewPlace | undefined, subscribedIds: string[]): PlaceRecord[] {
  const records: PlaceRecord[] = own && !place.tasters.some((taster) => taster.tasterId === MY_RECORD_ID)
    ? [...place.tasters, {
      tasterId: MY_RECORD_ID, tasterName: "내 기록", tag: "내 맛집", avatar: "", avatarVariant: 1, note: own.reason,
      menus: own.menus, photos: own.photos, tags: own.tags, tagGroups: own.tagGroups,
      visitConditions: own.visitConditions, placeCount: 1, recordedAt: own.createdAt,
    }]
    : place.tasters;
  const rank = (record: PlaceRecord) => record.tasterId === MY_RECORD_ID ? 2 : subscribedIds.includes(record.tasterId) ? 1 : 0;
  return [...records].sort((left, right) => rank(right) - rank(left)
    || (right.matchScore ?? 0) - (left.matchScore ?? 0)
    || (right.subscriberCount ?? 0) - (left.subscriberCount ?? 0)
    || left.tasterName.localeCompare(right.tasterName, "ko"));
}

/** 모든 기록의 사진과 메뉴 사진을 한 줄로 모읍니다. 같은 주소의 사진은 한 번만 넣습니다. */
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
      if (menu.photo) add({ src: menu.photo, record, caption: [menu.name, formatPrice(menu.price)].filter(Boolean).join(" · ") });
    });
  });
  return photos;
}

export function photoIndexOf(photos: PlacePhoto[], src?: string): number {
  if (!src) return -1;
  const key = src.split(/[?#]/, 1)[0];
  return photos.findIndex((photo) => photo.src.split(/[?#]/, 1)[0] === key);
}

const menuKey = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

/** 여러 맛객이 추천한 메뉴를 이름으로 묶어 추천 수가 많은 순으로 돌려줍니다. */
export function summarizeMenus(records: PlaceRecord[]): MenuSummary[] {
  const menus = new Map<string, MenuSummary>();
  records.forEach((record) => {
    const counted = new Set<string>();
    recordMenus(record).forEach((menu) => {
      const key = menuKey(menu.name);
      const current = menus.get(key) ?? { name: menu.name.trim(), count: 0 };
      if (!counted.has(key)) current.count += 1;
      counted.add(key);
      current.price ??= menu.price;
      current.photo ??= menu.photo;
      menus.set(key, current);
    });
  });
  return [...menus.values()].sort((left, right) => right.count - left.count);
}

/** 기록마다 한 번씩 센 값(태그·방문 조건)을 많은 순으로 돌려줍니다. */
export function countValues(records: PlaceRecord[], pick: (record: PlaceRecord) => readonly string[] | undefined): CountSummary[] {
  const counts = new Map<string, number>();
  records.forEach((record) => {
    new Set(pick(record) ?? []).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  });
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count);
}

/** 장소 서비스의 샘플 기록은 이니셜을 avatar로 주므로, 이미지 주소가 아니면 기본 캐릭터를 씁니다. */
export function avatarSource(record: PlaceRecord): string | undefined {
  const source = record.avatar?.trim();
  if (source && (/^demo-avatar:\d$/.test(source) || /^(https?:|data:image\/|blob:|\/media\/)/.test(source))) return source;
  return demoTasterAvatar(record.tasterId) ?? undefined;
}

export function avatarFallback(record: PlaceRecord): string | undefined {
  const fallback = demoTasterAvatar(record.tasterId);
  return fallback && fallback !== avatarSource(record) ? fallback : undefined;
}

export function hasCoordinates(place: Pick<Place, "latitude" | "longitude">): boolean {
  return Number.isFinite(place.latitude) && Number.isFinite(place.longitude)
    && !(place.latitude === 0 && place.longitude === 0);
}

export function kakaoPlaceUrl(place: Place): string {
  return place.providerPlaceId
    ? `http://m.map.kakao.com/scheme/place?id=${encodeURIComponent(place.providerPlaceId)}`
    : `http://m.map.kakao.com/scheme/look?p=${place.latitude},${place.longitude}`;
}

/** 현재 위치를 얻으면 출발지를 넣어 카카오맵 길찾기를 열고, 실패하면 도착지만 넣어 엽니다. */
export function openKakaoDirections(place: Place) {
  const openRoute = (origin?: GeolocationCoordinates) => {
    window.location.href = origin
      ? `http://m.map.kakao.com/scheme/route?sp=${origin.latitude},${origin.longitude}&ep=${place.latitude},${place.longitude}&by=car`
      : `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`;
  };
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(({ coords }) => openRoute(coords), () => openRoute(), { timeout: 5000, maximumAge: 60000 });
  } else openRoute();
}
