import type { Place, Taster } from "../../models/place";
import type { ActiveSubscription } from "../../services/community";
import { profileCoverFor } from "../../utils/profileMedia";

/** 맛객이 남긴 기록 하나: 장소와 그 장소에 남긴 맛객의 글 */
export type TasterRecord = { place: Place; entry: Taster };

export type TasterStats = { count: number; latest?: string };

function recordedTime(value?: string | null): number {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}

/** 맛객의 공개 기록을 최근 순으로 모읍니다. 시각이 없는 기록은 뒤로 보냅니다. */
export function recordsOf(places: Place[], isAuthor: (tasterId: string) => boolean): TasterRecord[] {
  return places
    .flatMap((place) => {
      const entry = place.tasters.find((taster) => isAuthor(taster.tasterId));
      return entry ? [{ place, entry }] : [];
    })
    .sort((a, b) => recordedTime(b.entry.recordedAt) - recordedTime(a.entry.recordedAt));
}

/** 맛객별 기록 수와 가장 최근 기록 시각을 한 번에 셉니다. */
export function statsByTaster(places: Place[]): Map<string, TasterStats> {
  const stats = new Map<string, TasterStats>();
  places.forEach((place) => {
    place.tasters.forEach((taster) => {
      const current = stats.get(taster.tasterId) ?? { count: 0 };
      current.count += 1;
      if (recordedTime(taster.recordedAt) > recordedTime(current.latest)) current.latest = taster.recordedAt ?? undefined;
      stats.set(taster.tasterId, current);
    });
  });
  return stats;
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

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

/** 종료일까지 남은 날짜(오늘 끝나면 0). 종료일이 없으면 null */
export function daysLeft(endAt: string | null): number | null {
  if (!endAt) return null;
  const end = new Date(endAt).getTime();
  if (Number.isNaN(end)) return null;
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}

/** "무료 · 기간 제한 없음", "유료 3개월 · 1월 29일까지 (D-12)" */
export function planLabel(subscription: Pick<ActiveSubscription, "subscriptionType" | "termMonths" | "endAt">): string {
  if (subscription.subscriptionType === "FREE") return "무료 · 기간 제한 없음";
  const left = daysLeft(subscription.endAt);
  const until = subscription.endAt ? ` · ${formatDate(subscription.endAt)}까지` : "";
  return `유료 ${subscription.termMonths ?? 0}개월${until}${left !== null ? ` (D-${left})` : ""}`;
}

/** 구독 기록에만 있고 맛객 목록에 없는 계정도 이름과 기본 그림으로 보여 줍니다. */
export function fallbackTaster(tasterId: string, name: string, avatar?: string | null, avatarVariant = 1): Taster {
  return { tasterId, tasterName: name, tag: "맛객", avatar: avatar ?? "", avatarVariant, note: "" };
}
