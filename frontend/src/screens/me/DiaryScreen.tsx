import { useMemo, useState } from "react";
import { back, go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { EmptyState } from "../../components/ui";
import {
  dayKey,
  entriesInMonth,
  entriesByDay,
  formatDay,
  formatDiaryRoute,
  isSameMonth,
  parseDiaryRoute,
  WEEKDAYS,
  type DiaryEntry,
} from "./diary";
import DiaryEntryCard from "./DiaryEntryCard";
import { useDiaryEntries } from "./useDiaryEntries";

/**
 * 기록 달력(#diary/<연-월>, 보드 14-01): 뒤로 버튼 옆 큰 "기록 달력"과 한 줄 설명, 카드 안 "< 2025년 3월 >"와 날짜(기록한 날은 연한
 * 코랄 원, 고른 날은 코랄 원), 아래 "3월 21일 (금)의 기록 N개" 띠와 기록 줄입니다. 날을 고르지 않으면 그 달 기록 전부를 보여 줍니다.
 * 보던 달은 주소에 담아(이동 기록은 늘리지 않고 바꿈) 상세에 다녀와도 그 달로 돌아옵니다. 날짜가 없는 기록은 맨 아래에 따로 둡니다.
 */
export default function DiaryScreen({ routeId }: { routeId: string }) {
  const { year, month } = parseDiaryRoute(routeId);
  const [selected, setSelected] = useState<string | null>(null);
  const entries = useDiaryEntries();
  const byDay = useMemo(() => entriesByDay(entries), [entries]);
  const undated = entries.filter((entry) => !entry.date);

  function moveMonth(step: number) {
    setSelected(null);
    const next = new Date(year, month + step, 1);
    go("diary", formatDiaryRoute({ year: next.getFullYear(), month: next.getMonth() }), true);
  }

  return (
    <main className="r-screen r-me-diary">
      <header className="r-me-diary__head">
        <button type="button" className="r-icon-button" onClick={() => back("my")} aria-label="이전 화면으로 돌아가기">
          <Icon name="back" />
        </button>
        <h1 className="r-display">기록 달력</h1>
      </header>
      <div className="r-me-body">
        <p className="r-me-diary__lead">날짜별로 남긴 기록을 찾아보세요.</p>
        {entries.length === 0 ? (
          <EmptyState
            icon="book"
            title="아직 기록이 없어요"
            message="다녀온 맛집을 기록하면 이곳 달력에 쌓여요."
            action={{ label: "첫 기록 남기기", onClick: () => go("register"), variant: "primary" }}
            className="r-me-empty"
          />
        ) : (
          <CalendarView
            year={year}
            month={month}
            byDay={byDay}
            entries={entries}
            selected={selected}
            onMonth={moveMonth}
            onSelect={(key) => setSelected((current) => (current === key ? null : key))}
          />
        )}
        {undated.length > 0 && (
          <section className="r-me-section">
            <p className="r-me-diary__band">날짜 없는 기록 {undated.length}개</p>
            {undated.map((entry) => (
              <DiaryEntryCard key={entry.place.id} entry={entry} />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function CalendarView({
  year,
  month,
  byDay,
  entries,
  selected,
  onMonth,
  onSelect,
}: {
  year: number;
  month: number;
  byDay: Map<string, DiaryEntry[]>;
  entries: DiaryEntry[];
  selected: string | null;
  onMonth: (step: number) => void;
  onSelect: (key: string) => void;
}) {
  const today = new Date();
  const todayKey = dayKey(today);
  const isCurrentMonth = isSameMonth(today, year, month);
  const leading = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const monthEntries = entriesInMonth(entries, year, month);
  const selectedEntries = selected ? (byDay.get(selected) ?? []) : [];
  const selectedDate = selected ? (selectedEntries[0]?.date ?? null) : null;
  const shown = selectedDate ? selectedEntries : monthEntries;

  return (
    <>
      <div className="r-me-calendar">
        <div className="r-me-month">
          <button type="button" className="r-icon-button" onClick={() => onMonth(-1)} aria-label="지난달">
            <Icon name="back" />
          </button>
          <b aria-live="polite">
            {year}년 {month + 1}월
          </b>
          <button
            type="button"
            className="r-icon-button"
            onClick={() => onMonth(1)}
            aria-label="다음 달"
            disabled={isCurrentMonth}
          >
            <Icon name="chevron" />
          </button>
        </div>
        <div className="r-me-calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((name, index) => (
            <span key={name} className={index === 0 ? "is-sunday" : ""}>
              {name}
            </span>
          ))}
        </div>
        <div className="r-me-calendar__grid">
          {Array.from({ length: leading }, (_, index) => (
            <span key={`blank-${index}`} />
          ))}
          {Array.from({ length: days }, (_, index) => {
            const date = new Date(year, month, index + 1);
            const key = dayKey(date);
            const dayEntries = byDay.get(key);
            const state = `${date.getDay() === 0 ? " is-sunday" : ""}${key === todayKey ? " is-today" : ""}${
              key === selected ? " is-selected" : ""
            }`;
            if (!dayEntries)
              return (
                <span key={key} className={`r-me-day${state}`}>
                  {index + 1}
                </span>
              );
            return (
              <button
                type="button"
                key={key}
                className={`r-me-day is-recorded${state}`}
                aria-pressed={key === selected}
                aria-label={`${formatDay(date)} 기록 ${dayEntries.length}곳`}
                onClick={() => onSelect(key)}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </div>

      <section className="r-me-section">
        <p className="r-me-diary__band">
          {selectedDate
            ? `${formatDay(selectedDate)}의 기록 ${shown.length}개`
            : `${month + 1}월 기록 ${shown.length}개`}
        </p>
        {shown.length ? (
          shown.map((entry) => <DiaryEntryCard key={entry.place.id} entry={entry} />)
        ) : (
          <p className="r-me-note r-muted">이 달에는 남긴 기록이 없어요.</p>
        )}
      </section>
    </>
  );
}
