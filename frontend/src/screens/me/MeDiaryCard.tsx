import { useMemo } from "react";
import { go } from "../../app/navigation";
import PlaceThumb from "../../components/PlaceThumb";
import { dayKey, entriesByDay, isSameMonth, WEEKDAYS, type DiaryEntry } from "./diary";

/** 나 탭의 다이어리 카드: 이번 달 기록 수, 이번 주 한 줄 달력, 지난달과 비교. */
export default function MeDiaryCard({ entries }: { entries: DiaryEntry[] }) {
  const byDay = useMemo(() => entriesByDay(entries), [entries]);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastMonth = new Date(year, month - 1, 1);
  const thisMonthCount = entries.filter((entry) => entry.date && isSameMonth(entry.date, year, month)).length;
  const lastMonthCount = entries.filter(
    (entry) => entry.date && isSameMonth(entry.date, lastMonth.getFullYear(), lastMonth.getMonth()),
  ).length;
  const monthDiff = thisMonthCount - lastMonthCount;
  // 이번 주(일~토)를 한 줄 달력으로 보여 줍니다.
  const week = Array.from({ length: 7 }, (_, index) => new Date(year, month, today.getDate() - today.getDay() + index));

  return (
    <button type="button" className="r-card r-me-diary-card" onClick={() => go("diary")}>
      <span className="r-me-diary-card__head">
        <b className="r-display">내 맛집 다이어리</b>
        <small className="r-muted">
          {month + 1}월 {thisMonthCount}곳
        </small>
      </span>
      <span className="r-me-week" aria-hidden="true">
        {week.map((day) => {
          const first = byDay.get(dayKey(day))?.[0];
          const isToday = dayKey(day) === dayKey(today);
          return first ? (
            <PlaceThumb key={dayKey(day)} place={first.place} photo={first.photo} className="r-me-week__photo" />
          ) : (
            <span key={dayKey(day)} className={`r-me-week__day ${isToday ? "is-today" : ""}`}>
              <small>{WEEKDAYS[day.getDay()]}</small>
              {day.getDate()}
            </span>
          );
        })}
      </span>
      <span className="r-me-diary-card__total">
        <b>{entries.length}</b>
        <small className="r-muted">
          곳 기록
          {entries.length > 0 &&
            lastMonthCount + thisMonthCount > 0 &&
            (monthDiff > 0
              ? ` · 지난달보다 ${monthDiff}곳 많아요`
              : monthDiff < 0
                ? ` · 지난달엔 ${lastMonthCount}곳 기록했어요`
                : " · 지난달과 같은 속도예요")}
          {entries.length === 0 && " · 첫 기록을 남겨 보세요"}
        </small>
      </span>
    </button>
  );
}
