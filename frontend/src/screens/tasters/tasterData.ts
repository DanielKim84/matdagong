/** 맛객 탭·맛객 프로필·구독 관리가 함께 쓰는 맛객 목록 계산, 표시 문구, 구독 해지 확인입니다. */
import type { useNotificationDialog } from "../../components/NotificationDialog";
import type { ActiveSubscription, MyProfile } from "../../models/community";
import type { Place, Taster } from "../../models/place";
import { shortSidoName } from "../../models/region";
import { compareByTrust } from "../../models/trust";
import { DAY_MS, formatMonthDay, parseTime } from "../../utils/format";
import { distanceMeters, type Coordinates } from "../../utils/geo";
import { profileCoverFor } from "../../utils/profileMedia";

/** 맛객이 남긴 기록 하나: 장소와 그 장소에 남긴 맛객의 글 */
export type TasterRecord = { place: Place; entry: Taster };

export type TasterStats = { count: number };

export type TasterFocusFilter = "ALL" | "RESTAURANT" | "CAFE_DESSERT";

/**
 * 맛객 탭의 지역 조건(분야 조건과 함께 취향 맞는 맛객·맛객 둘러보기가 모두 따름): 전체 지역 · 내 주변(지금 위치 가까이에 기록) ·
 * 내 지역(프로필에 등록한 내 활동 지역) · 여행·드라이브 맛객
 */
export type TasterScope = "ALL" | "NEARBY" | "MY_AREA" | "TRAVEL";

/** 범위를 거를 때 필요한 값. 내 주변은 position, 내 지역은 myArea가 있어야 거를 수 있습니다. */
export type ScopeContext = { places: Place[]; position: Coordinates | null; myArea: string | null };

/** 맛객 둘러보기 정렬: 구독자 많은 순 · 취향 맞는 순(믿고 가는 맛객 → 신뢰 % → 취향 %) · 기록 많은 순 */
export type BrowseSort = "SUBSCRIBERS" | "TASTE" | "RECORDS";

/** 맛객 둘러보기 목록의 정렬과 보이는 개수입니다. 지역·분야는 위쪽 공통 조건을 따릅니다. */
export type BrowseFilter = { sort: BrowseSort; limit: number };

/** "내 주변"으로 볼 거리(m). 이 안에 공개 기록이 있는 맛객을 내 주변 맛객으로 봅니다. */
export const NEARBY_RADIUS_METERS = 5_000;
export const NEARBY_RADIUS_KM = NEARBY_RADIUS_METERS / 1000;

/** 맛객 둘러보기에서 한 번에 보여 주는 수. "더 보기"도 이만큼씩 늘립니다. */
export const PAGE_SIZE = 12;

/** 시각이 없거나 읽을 수 없는 기록은 가장 오래된 것으로 칩니다. */
function recordedTime(value?: string | null): number {
  return parseTime(value) ?? 0;
}

/** 넘긴 장소 중 이 맛객이 남긴 기록을 최근 순으로 모읍니다(공개 범위는 넘긴 목록을 따름). 시각이 없는 기록은 뒤로 보냅니다. */
export function recordsOf(places: Place[], isAuthor: (tasterId: string) => boolean): TasterRecord[] {
  return places
    .flatMap((place) => {
      const entry = place.tasters.find((taster) => isAuthor(taster.tasterId));
      return entry ? [{ place, entry }] : [];
    })
    .sort((left, right) => recordedTime(right.entry.recordedAt) - recordedTime(left.entry.recordedAt));
}

/** 맛객별 기록 수를 한 번에 셉니다. */
export function statsByTaster(places: Place[]): Map<string, TasterStats> {
  const stats = new Map<string, TasterStats>();
  places.forEach((place) => {
    place.tasters.forEach((taster) => {
      const current = stats.get(taster.tasterId) ?? { count: 0 };
      current.count += 1;
      stats.set(taster.tasterId, current);
    });
  });
  return stats;
}

function isTraveler(taster: Taster): boolean {
  return taster.activityScope === "TRAVEL" || taster.activityScope === "BOTH";
}

/** 여행·드라이브 맛객이 한 명이라도 있는지 봅니다. 없으면 지역 고르기에서 그 항목을 숨깁니다. */
export function hasTravelers(tasters: Taster[]): boolean {
  return tasters.some(isTraveler);
}

/**
 * 시·도와 시·군·구까지만 남긴 비교용 지역 이름입니다. "서울특별시 마포구 망원동"과 주소 "서울 마포구 동교로 251"이
 * 모두 "서울 마포구"가 되어 활동 지역과 기록 주소를 같은 기준으로 견줄 수 있습니다. 시·도를 못 찾으면 null입니다.
 */
export function areaKey(text: string | null | undefined): string | null {
  const sido = shortSidoName(text);
  const district = text?.trim().split(/\s+/)[1];
  return sido && district ? `${sido} ${district}` : null;
}

/** 조건에 맞는 장소에 공개 기록을 남긴 맛객별 기록 수입니다. */
function countRecords(places: Place[], isIn: (place: Place) => boolean): Map<string, number> {
  const counts = new Map<string, number>();
  places
    .filter(isIn)
    .forEach((place) =>
      place.tasters
        .filter((taster) => taster.visibility !== "PRIVATE")
        .forEach((taster) => counts.set(taster.tasterId, (counts.get(taster.tasterId) ?? 0) + 1)),
    );
  return counts;
}

/**
 * 내 주변·내 지역 범위 안에 남긴 맛객별 기록 수입니다. 맛객이 적어 둔 지역 글자보다 실제 기록 위치를 먼저 봅니다.
 * 전체·여행이거나 위치·내 지역을 아직 모르면 undefined입니다.
 */
export function scopeRecordCounts(scope: TasterScope, context: ScopeContext): Map<string, number> | undefined {
  const { places, position, myArea } = context;
  if (scope === "NEARBY" && position)
    return countRecords(places, (place) => distanceMeters(position, place) <= NEARBY_RADIUS_METERS);
  if (scope === "MY_AREA" && myArea) return countRecords(places, (place) => areaKey(place.address) === myArea);
  return undefined;
}

/** 이 맛객이 범위에 드는지. 내 지역은 그 지역에 기록이 있거나, 활동 지역을 내 지역으로 적어 둔 맛객(여행 위주 제외)입니다. */
export function isInScope(
  taster: Taster,
  scope: TasterScope,
  counts: Map<string, number> | undefined,
  myArea: string | null,
): boolean {
  if (scope === "TRAVEL") return isTraveler(taster);
  const recordCount = counts?.get(taster.tasterId) ?? 0;
  if (scope === "NEARBY") return recordCount > 0;
  if (scope === "MY_AREA")
    return (
      recordCount > 0 || (taster.activityScope !== "TRAVEL" && !!myArea && areaKey(taster.activityRegion) === myArea)
    );
  return true;
}

/** 고른 분야(식당·카페·디저트)를 다루는 맛객인지. 둘 다 다루는 맛객은 어느 분야에도 듭니다. */
export function matchesFocus(taster: Taster, focus: TasterFocusFilter): boolean {
  return focus === "ALL" || taster.tasterFocus === focus || taster.tasterFocus === "BOTH";
}

/**
 * 고른 지역·분야에 맞는 맛객을 고른 정렬로 줄 세웁니다. 기록 많은 순은 내 주변·내 지역이면 그 안에 남긴 기록 수를 먼저 봅니다.
 * 기준이 같으면 구독자 많은 순 → 전체 기록 많은 순으로 잇습니다.
 */
export function filterBrowseTasters(
  tasters: Taster[],
  scope: TasterScope,
  focus: TasterFocusFilter,
  sort: BrowseSort,
  stats: Map<string, TasterStats>,
  context: ScopeContext,
): Taster[] {
  const counts = scopeRecordCounts(scope, context);
  const areaCountOf = (taster: Taster) => counts?.get(taster.tasterId) ?? 0;
  // 목록 줄의 "기록 N곳"과 같은 수로 줄 세웁니다.
  const totalCountOf = (taster: Taster) => recordCountOf(taster, stats);
  const bySubscribers = (left: Taster, right: Taster) =>
    (right.subscriberCount ?? 0) - (left.subscriberCount ?? 0) || totalCountOf(right) - totalCountOf(left);
  const compare: Record<BrowseSort, (left: Taster, right: Taster) => number> = {
    SUBSCRIBERS: bySubscribers,
    TASTE: (left, right) => compareByTrust(left, right) || bySubscribers(left, right),
    RECORDS: (left, right) =>
      areaCountOf(right) - areaCountOf(left) || totalCountOf(right) - totalCountOf(left) || bySubscribers(left, right),
  };
  return tasters
    .filter((taster) => isInScope(taster, scope, counts, context.myArea) && matchesFocus(taster, focus))
    .sort(compare[sort]);
}

/** 닉네임·소개·지역·취향 태그에 검색어가 들어간 맛객입니다. keyword는 소문자로 다듬어 넘깁니다. */
export function searchTasters(tasters: Taster[], keyword: string): Taster[] {
  if (!keyword) return [];
  return tasters.filter((taster) =>
    [taster.tasterName, taster.intro, taster.activityRegion, ...tagsOf(taster)].some((text) =>
      text?.toLowerCase().includes(keyword),
    ),
  );
}

/** 목록 줄의 "기록 N곳"입니다. 지도에 받은 공개 장소에서 센 수이고, 받은 기록이 없으면 0입니다. */
export function recordCountOf(taster: Taster, stats: Map<string, TasterStats>): number {
  return stats.get(taster.tasterId)?.count ?? 0;
}

/** 대표 배경 사진 한 장(올린 첫 장, 없으면 맛객별 기본 배경)입니다. */
export function coverOf(taster: Taster): string {
  return profileCoverFor(taster.tasterId, taster.profileCoverUrls?.[0]);
}

/** 프로필 위쪽에서 넘겨 볼 배경 사진들입니다. 올린 사진이 없으면 기본 배경 한 장입니다. */
export function coversOf(taster: Taster): string[] {
  const uploaded = taster.profileCoverUrls?.filter(Boolean) ?? [];
  return uploaded.length ? uploaded.map((url) => profileCoverFor(taster.tasterId, url)) : [coverOf(taster)];
}

/** 소개가 없으면 기본 문구를 보여 줄 소개 한 줄입니다. */
export function introOf(taster: Taster): string {
  return taster.intro?.trim() || "맛있는 장소를 찾아 기록하고 있어요.";
}

/** 맛객 분야 이름표입니다. 모르면 null이라 칩을 그리지 않습니다. */
export function focusLabel(focus?: Taster["tasterFocus"]): string | null {
  if (focus === "RESTAURANT") return "식당";
  if (focus === "CAFE_DESSERT") return "카페·디저트";
  if (focus === "BOTH") return "식당·카페";
  return null;
}

/** "망원 중심", "여행·드라이브"처럼 활동 지역을 짧게 씁니다. */
export function activityLabel(taster: Taster): string | null {
  const region = taster.activityRegion?.trim();
  if (taster.activityScope === "TRAVEL") return "여행·드라이브";
  if (taster.activityScope === "BOTH") return region ? `${region} · 여행` : "동네·여행";
  return region || null;
}

/** 맛객의 공개 취향 태그(프로필 태그)입니다. 장소 기록에서만 알게 된 맛객은 빈 목록입니다. */
export function tagsOf(taster: Taster): string[] {
  return taster.profileTags ?? [];
}

/** 종료일까지 남은 날짜(오늘 끝나면 0). 종료일이 없으면 null */
export function daysLeft(endAt: string | null): number | null {
  const end = parseTime(endAt);
  if (end === null) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / DAY_MS));
}

/** "무료 · 기간 제한 없음", "유료 3개월 · 1월 29일까지 (D-12)" */
export function planLabel(subscription: Pick<ActiveSubscription, "subscriptionType" | "termMonths" | "endAt">): string {
  if (subscription.subscriptionType === "FREE") return "무료 · 기간 제한 없음";
  const left = daysLeft(subscription.endAt);
  const until = subscription.endAt ? ` · ${formatMonthDay(subscription.endAt)}까지` : "";
  return `유료 ${subscription.termMonths ?? 0}개월${until}${left !== null ? ` (D-${left})` : ""}`;
}

/** 구독한 맛객의 프로필입니다. 맛객 목록에 없는 계정이면 구독 기록의 이름과 기본 그림으로 채웁니다. */
export function subscribedTaster(
  tasterById: Map<string, Taster>,
  subscription: Pick<ActiveSubscription, "targetAccountId" | "targetNickname">,
): Taster {
  return (
    tasterById.get(subscription.targetAccountId) ?? {
      tasterId: subscription.targetAccountId,
      tasterName: subscription.targetNickname,
      avatar: "",
      avatarVariant: 1,
      note: "",
    }
  );
}

/** 내 프로필은 맛객 목록에 없을 수 있어 내 프로필 정보로 맛객 모양을 만듭니다. */
export function tasterFromProfile(profile: MyProfile, nickname: string, subscriberCount: number): Taster {
  return {
    tasterId: profile.accountId,
    tasterName: nickname,
    avatar: profile.profileImgUrl ?? "",
    avatarVariant: profile.avatarVariant,
    note: "",
    intro: profile.intro ?? undefined,
    profileCoverUrls: profile.profileCoverUrls,
    tasterFocus: profile.tasterFocus,
    activityScope: profile.activityScope,
    activityRegion: profile.activityRegion,
    profileTags: profile.profileTags,
    subscriberCount,
  };
}

type ConfirmDialog = ReturnType<typeof useNotificationDialog>["confirm"];

/** 구독 해지 확인 창. 유료 구독이면 원래 종료 예정일을 함께 보여 줍니다. 해지하기로 하면 true입니다. */
export function confirmCancelSubscription(
  confirm: ConfirmDialog,
  tasterName: string,
  subscription?: Pick<ActiveSubscription, "subscriptionType" | "endAt">,
): Promise<boolean> {
  const paidEnd =
    subscription?.subscriptionType === "PAID" && subscription.endAt ? formatMonthDay(subscription.endAt) : null;
  return confirm({
    title: paidEnd ? "유료 구독을 해지할까요?" : "구독을 해지할까요?",
    message: paidEnd
      ? "지금 해지하면 남은 기간과 관계없이 구독이 바로 끝나요."
      : `${tasterName} 맛객의 새 기록 알림과 구독 피드 표시가 멈춰요.`,
    ...(paidEnd ? { detail: { label: "원래 종료 예정일", value: paidEnd } } : {}),
    tone: "danger",
    confirmLabel: "구독 해지",
  });
}
