import type { useNotificationDialog } from "../../components/NotificationDialog";
import type { ActiveSubscription, MyProfile } from "../../models/community";
import type { Place, Taster } from "../../models/place";
import { DAY_MS, formatMonthDay, parseTime } from "../../utils/format";
import { profileCoverFor } from "../../utils/profileMedia";

/** 맛객이 남긴 기록 하나: 장소와 그 장소에 남긴 맛객의 글 */
export type TasterRecord = { place: Place; entry: Taster };

export type TasterStats = { count: number; latest?: string };

export type TasterFocusFilter = "ALL" | "RESTAURANT" | "CAFE_DESSERT";

/** 동네 맛객 목록의 고른 조건과 보이는 개수. region이 TRAVEL_REGION이면 여행·드라이브 맛객입니다. */
export type LocalTasterFilter = { region: string; focus: TasterFocusFilter; limit: number };

/** 지역 칩에서 "여행·드라이브"를 고른 상태입니다. 실제 지역 이름과 겹치지 않는 값을 씁니다. */
export const TRAVEL_REGION = "__travel";

/** 동네 맛객을 한 번에 보여 주는 수. "더 보기"도 이만큼씩 늘립니다. */
export const PAGE_SIZE = 12;

const REGION_CHIP_LIMIT = 8;

/** 시각이 없거나 읽을 수 없는 기록은 가장 오래된 것으로 칩니다. */
function recordedTime(value?: string | null): number {
  return parseTime(value) ?? 0;
}

/** 맛객의 공개 기록을 최근 순으로 모읍니다. 시각이 없는 기록은 뒤로 보냅니다. */
export function recordsOf(places: Place[], isAuthor: (tasterId: string) => boolean): TasterRecord[] {
  return places
    .flatMap((place) => {
      const entry = place.tasters.find((taster) => isAuthor(taster.tasterId));
      return entry ? [{ place, entry }] : [];
    })
    .sort((left, right) => recordedTime(right.entry.recordedAt) - recordedTime(left.entry.recordedAt));
}

/** 맛객별 기록 수와 가장 최근 기록 시각을 한 번에 셉니다. */
export function statsByTaster(places: Place[]): Map<string, TasterStats> {
  const stats = new Map<string, TasterStats>();
  places.forEach((place) => {
    place.tasters.forEach((taster) => {
      const current = stats.get(taster.tasterId) ?? { count: 0 };
      current.count += 1;
      if (recordedTime(taster.recordedAt) > recordedTime(current.latest))
        current.latest = taster.recordedAt ?? undefined;
      stats.set(taster.tasterId, current);
    });
  });
  return stats;
}

function isTraveler(taster: Taster): boolean {
  return taster.activityScope === "TRAVEL" || taster.activityScope === "BOTH";
}

/** 활동 지역 칩: 맛객이 많은 지역 순으로 최대 8개 */
export function topRegions(tasters: Taster[]): string[] {
  const regionCounts = new Map<string, number>();
  tasters.forEach((taster) => {
    const name = taster.activityScope !== "TRAVEL" ? taster.activityRegion?.trim() : "";
    if (name) regionCounts.set(name, (regionCounts.get(name) ?? 0) + 1);
  });
  return [...regionCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, REGION_CHIP_LIMIT)
    .map(([name]) => name);
}

export function hasTravelers(tasters: Taster[]): boolean {
  return tasters.some(isTraveler);
}

/** 고른 지역·분야에 맞는 맛객을 구독자 많은 순(같으면 기록 많은 순)으로 줄 세웁니다. */
export function filterLocalTasters(
  tasters: Taster[],
  filter: Pick<LocalTasterFilter, "region" | "focus">,
  stats: Map<string, TasterStats>,
): Taster[] {
  return tasters
    .filter((taster) => {
      if (filter.region === TRAVEL_REGION) return isTraveler(taster);
      if (filter.region) return taster.activityScope !== "TRAVEL" && taster.activityRegion?.trim() === filter.region;
      return true;
    })
    .filter((taster) => filter.focus === "ALL" || taster.tasterFocus === filter.focus || taster.tasterFocus === "BOTH")
    .sort(
      (left, right) =>
        (right.subscriberCount ?? 0) - (left.subscriberCount ?? 0) ||
        (stats.get(right.tasterId)?.count ?? 0) - (stats.get(left.tasterId)?.count ?? 0),
    );
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

export function coverOf(taster: Taster): string {
  return profileCoverFor(taster.tasterId, taster.profileCoverUrls?.[0] ?? taster.profileCoverUrl);
}

export function introOf(taster: Taster): string {
  return taster.intro?.trim() || taster.note?.trim() || "맛있는 장소를 찾아 기록하고 있어요.";
}

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

/** 맛객의 공개 취향 태그. 프로필 태그가 없으면 예전 tag 문자열을 나눠 씁니다. */
export function tagsOf(taster: Taster): string[] {
  if (taster.profileTags?.length) return taster.profileTags;
  return taster.tag && taster.tag !== "맛객" ? taster.tag.split(" · ").filter(Boolean) : [];
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

/** 구독 기록에만 있고 맛객 목록에 없는 계정도 이름과 기본 그림으로 보여 줍니다. */
export function fallbackTaster(tasterId: string, name: string, avatar?: string | null, avatarVariant = 1): Taster {
  return { tasterId, tasterName: name, tag: "맛객", avatar: avatar ?? "", avatarVariant, note: "" };
}

/** 내 프로필은 맛객 목록에 없을 수 있어 내 프로필 정보로 맛객 모양을 만듭니다. */
export function tasterFromProfile(profile: MyProfile, nickname: string, subscriberCount: number): Taster {
  return {
    tasterId: profile.accountId,
    tasterName: nickname,
    tag: profile.profileTags.join(" · ") || "맛객",
    avatar: profile.profileImgUrl ?? "",
    avatarVariant: profile.avatarVariant,
    note: "",
    intro: profile.intro ?? undefined,
    profileCoverUrl: profile.profileCoverUrl,
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
