import { useMemo } from "react";
import { go } from "../../app/navigation";
import PlaceThumb from "../../components/PlaceThumb";
import { dayKey, entriesByDay, entriesInMonth, WEEKDAYS, type DiaryEntry } from "./diary";

/**
 * 나 탭의 다이어리 카드: "MY FOOD DIARY" 머리와 큰 제목 아래에 이번 주 한 줄 달력(기록한 날은 그날 사진)과
 * 전체 기록 수·지난달과 비교를 둡니다. 누르면 맛집 다이어리(#diary) 달력으로 갑니다.
 */
export default function MeDiaryCard({ entries }: { entries: DiaryEntry[] }) {
  const byDay = useMemo(() => entriesByDay(entries), [entries]);
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  const lastMonth = new Date(year, month - 1, 1);
  const thisMonthCount = entriesInMonth(entries, year, month).length;
  const lastMonthCount = entriesInMonth(entries, lastMonth.getFullYear(), lastMonth.getMonth()).length;
  const monthDiff = thisMonthCount - lastMonthCount;
  // 이번 주(일~토)를 한 줄 달력으로 보여 줍니다.
  const week = Array.from({ length: 7 }, (_, index) => new Date(year, month, today.getDate() - today.getDay() + index));

  return (
    <button type="button" className="r-card r-me-feature" onClick={() => go("diary")}>
      <span className="r-me-feature__head">
        <small lang="en">MY FOOD DIARY</small>
        <b className="r-display">나의 맛집 다이어리</b>
      </span>
      <span className="r-me-week" aria-hidden="true">
        {week.map((day) => {
          const key = dayKey(day);
          const first = byDay.get(key)?.[0];
          const isToday = key === dayKey(today);
          const isFuture = !isToday && day > today;
          // 요일은 칸 위에 따로 두고, 칸에는 날짜(오늘은 코랄 채움, 지나지 않은 날은 흐리게) 또는 그날 기록 사진을 둡니다.
          return (
            <span key={key} className={`r-me-week__col ${isToday ? "is-today" : ""} ${isFuture ? "is-future" : ""}`}>
              <small>{WEEKDAYS[day.getDay()]}</small>
              {first ? (
                <PlaceThumb place={first.place} photo={first.photo} className="r-me-week__photo" />
              ) : (
                <b className="r-me-week__date">{day.getDate()}</b>
              )}
            </span>
          );
        })}
      </span>
      <span className="r-me-diary-card__total">
        <b>
          {entries.length}
          <small>곳</small>
        </b>
        <small className="r-muted">
          기록
          {lastMonthCount + thisMonthCount > 0 &&
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
