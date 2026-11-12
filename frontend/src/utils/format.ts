/** 화면에 보이는 날짜·숫자·거리·분류 표시를 한곳에서 맞춥니다. 화면에서 toLocaleString을 직접 쓰지 않습니다. */

export const DAY_MS = 24 * 60 * 60 * 1000;

const NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

/** ISO-8601 문자열 등을 시각(ms)으로 바꿉니다. 값이 없거나 읽을 수 없으면 null입니다. */
export function parseTime(value?: string | number | Date | null): number | null {
  if (value === null || value === undefined || value === "") return null;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? null : time;
}

/** 기기 시간대로 그날 0시의 시각(ms)입니다. 오늘·이번 주처럼 날짜로 묶을 때 씁니다. */
export function startOfDay(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

/** "3시간 전", "어제", "10월 26일"처럼 기록 시각을 짧게 보여 줍니다. 값이 없거나 읽을 수 없으면 빈 문자열입니다. */
export function formatRelativeTime(value?: string | null): string {
  const time = parseTime(value);
  if (time === null) return "";
  const minutes = Math.floor((Date.now() - time) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return formatMonthDay(time);
}

/** "10월 26일". 읽을 수 없는 값은 빈 문자열입니다. */
export function formatMonthDay(value?: string | number | Date | null): string {
  const time = parseTime(value);
  return time === null ? "" : new Date(time).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}

/** "2026. 10. 26." 읽을 수 없는 값은 빈 문자열입니다. */
export function formatFullDate(value?: string | number | Date | null): string {
  const time = parseTime(value);
  return time === null ? "" : new Date(time).toLocaleDateString("ko-KR");
}

/** "12,345". 숫자가 아니면 "0"입니다. */
export function formatNumber(value?: number | null): string {
  return NUMBER_FORMAT.format(value != null && Number.isFinite(value) ? value : 0);
}

/** "12,000원". 가격을 모르면 빈 문자열입니다. */
export function formatWon(value?: number | null): string {
  return value != null && Number.isFinite(value) ? `${NUMBER_FORMAT.format(value)}원` : "";
}

/** 1km 미만은 10m 단위 "350m", 10km 미만은 "2.4km", 그 이상은 "12km". 거리를 모르면 빈 문자열입니다. */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null || !Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)}m`;
  return `${(meters / 1000).toFixed(meters < 10_000 ? 1 : 0)}km`;
}

/** 가게 분류 이름입니다(shortCategory). 비어 있으면 "맛집"입니다. */
export function categoryLabel(category?: string | null): string {
  return shortCategory(category) || "맛집";
}

/**
 * 가게 분류는 제공처가 준 글자 그대로 저장되어 있어(카카오 "음식점 > 카페 > 커피전문점 > 블루보틀"), 화면에서만 줄입니다.
 * ">"로 나눠 맨 앞 "음식점"을 빼고 앞의 두 단계만 "카페 · 커피전문점"처럼 잇습니다. 넷째 단계는 가게 이름(프랜차이즈)일 때가
 * 많아 뺍니다. 띄어쓰기 없는 ">"(네이버 지역 검색 "한식>육류,고기요리")도 같은 규칙으로 읽습니다. 비어 있으면 빈 문자열입니다.
 */
export function shortCategory(category?: string | null): string {
  return (category ?? "")
    .split(">")
    .map((part) => part.trim())
    .filter((part) => part && part !== "음식점")
    .slice(0, 2)
    .join(" · ");
}
