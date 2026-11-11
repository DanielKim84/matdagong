import { placePhoto, type Place, type Taster } from "../../models/place";
import { formatMonthDay, parseTime } from "../../utils/format";

/** 맛집 다이어리·나 탭이 함께 쓰는 내 기록 날짜 묶기와 다이어리 주소 계산입니다. */

/** 다이어리에 쓰는 내 기록 한 건: 장소, 그 장소의 내 기록, 기록 시각(없을 수 있음), 대표 사진, 공개 여부. */
export type DiaryEntry = {
  place: Place;
  record?: Taster;
  date: Date | null;
  photo?: string;
  isPublic: boolean;
};

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 내 기록 목록을 다이어리 항목으로 바꿉니다. 최근 기록이 먼저, 시각이 없는 기록은 맨 뒤입니다. */
export function diaryEntries(
  places: Place[],
  isMine: (tasterId: string) => boolean,
  photoFor: (placeId: string) => string | undefined,
): DiaryEntry[] {
  return places
    .map((place) => {
      const record = place.tasters.find((taster) => isMine(taster.tasterId));
      const time = parseTime(record?.recordedAt);
      return {
        place,
        record,
        date: time === null ? null : new Date(time),
        // 대표 사진 우선순위는 앱 전체 기준(placePhoto)을 따릅니다: 내 기록 사진 → 다른 기록 사진 → 내가 올린 사진.
        photo: placePhoto(place, record, photoFor(place.id)),
        isPublic: record?.visibility !== "PRIVATE",
      };
    })
    .sort((left, right) => (right.date?.getTime() ?? -Infinity) - (left.date?.getTime() ?? -Infinity));
}

/** 날짜별로 묶을 때 쓰는 키("2026-3-7", 자리 맞춤 없음)입니다. 화면에 보여 주는 값이 아닙니다. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

/** 같은 해·같은 달인지 봅니다. month는 0부터 셉니다. */
export function isSameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

/** 그 달(month는 0부터)에 남긴 기록입니다. 날짜 없는 기록은 빠집니다. */
export function entriesInMonth(entries: DiaryEntry[], year: number, month: number): DiaryEntry[] {
  return entries.filter((entry) => entry.date && isSameMonth(entry.date, year, month));
}

/** "10월 26일 (일)" */
export function formatDay(date: Date): string {
  return `${formatMonthDay(date)} (${WEEKDAYS[date.getDay()]})`;
}

export type DiaryView = "calendar" | "photo" | "list";
/** 다이어리 주소(#diary/<값>)에 담는 보기 상태. month는 0부터 셉니다. */
type DiaryRoute = { view: DiaryView; year: number; month: number };

const DIARY_VIEWS: DiaryView[] = ["calendar", "photo", "list"];
const DIARY_ROUTE_PATTERN = /^(calendar|photo|list)(?:\.(\d{4})-(\d{2}))?$/;

/**
 * 주소의 값("photo", "calendar.2026-03")을 보기 상태로 바꿉니다. 상세로 갔다가 뒤로 오면 이 값으로
 * 보던 탭과 달을 되살립니다. 값이 없거나 잘못되면 이번 달 달력입니다.
 */
export function parseDiaryRoute(value: string, today = new Date()): DiaryRoute {
  const match = DIARY_ROUTE_PATTERN.exec(value);
  const fallback = { year: today.getFullYear(), month: today.getMonth() };
  if (!match) return { view: "calendar", ...fallback };
  const view = DIARY_VIEWS.find((item) => item === match[1]) ?? "calendar";
  const month = Number(match[3]) - 1;
  return match[2] && month >= 0 && month <= 11 ? { view, year: Number(match[2]), month } : { view, ...fallback };
}

/** 보기 상태를 주소 값으로 바꿉니다. 달은 달력에서만 담습니다. */
export function formatDiaryRoute({ view, year, month }: DiaryRoute): string {
  return view === "calendar" ? `calendar.${year}-${String(month + 1).padStart(2, "0")}` : view;
}

/** 날짜별로 묶은 기록. 같은 날 여러 곳이면 최근 기록이 먼저입니다. */
export function entriesByDay(entries: DiaryEntry[]): Map<string, DiaryEntry[]> {
  const map = new Map<string, DiaryEntry[]>();
  for (const entry of entries) {
    if (!entry.date) continue;
    const key = dayKey(entry.date);
    map.set(key, [...(map.get(key) ?? []), entry]);
  }
  return map;
}
