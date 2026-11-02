import { placePhoto, type Place, type Taster } from "../../models/place";
import { formatMonthDay, parseTime } from "../../utils/format";

/** 다이어리에 쓰는 내 기록 한 건: 장소, 그 장소의 내 기록, 기록 시각(없을 수 있음), 대표 사진. */
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
        isPublic: record ? record.visibility !== "PRIVATE" : place.visibility !== "private",
      };
    })
    .sort((left, right) => (right.date?.getTime() ?? -Infinity) - (left.date?.getTime() ?? -Infinity));
}

export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function sameMonth(date: Date, year: number, month: number): boolean {
  return date.getFullYear() === year && date.getMonth() === month;
}

/** "10월 26일 (일)" */
export function formatDay(date: Date): string {
  return `${formatMonthDay(date)} (${WEEKDAYS[date.getDay()]})`;
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
