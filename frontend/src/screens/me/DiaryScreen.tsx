import { useMemo, useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import { Segmented, TopBar } from "../../components/ui";
import { dayKey, diaryEntries, entriesByDay, formatDay, sameMonth, WEEKDAYS, type DiaryEntry } from "./diary";
import { DiaryEntryCard, MeThumb } from "./MeParts";

type View = "calendar" | "photo" | "list";

/** 맛집 다이어리(#diary): 내 기록을 달력·사진·목록으로 봅니다. */
export default function DiaryScreen() {
  const app = useAppData();
  const [view, setView] = useState<View>("calendar");
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(null);

  const entries = useMemo(
    () => diaryEntries(app.myRecords, app.isMyTasterId, app.photoFor),
    [app.myRecords, app.isMyTasterId, app.photoFor],
  );
  const byDay = useMemo(() => entriesByDay(entries), [entries]);
  const undated = entries.filter((entry) => !entry.date);

  return (
    <main className="r-screen r-me-diary-screen">
      <TopBar
        title="맛집 다이어리"
        fallback="my"
        right={(
          <button type="button" className="r-icon-button" onClick={() => go("register")} aria-label="새 기록 남기기">
            <Icon name="plus" />
          </button>
        )}
      />
      <div className="r-me-body">
        <Segmented<View>
          label="다이어리 보기 방식"
          value={view}
          onChange={setView}
          options={[
            { value: "calendar", label: "달력" },
            { value: "photo", label: "사진" },
            { value: "list", label: "목록" },
          ]}
        />
        {entries.length === 0 ? (
          <div className="r-card r-empty">
            <span className="r-badge-icon"><Icon name="book" /></span>
            <b>아직 기록이 없어요</b>
            <p>다녀온 맛집을 기록하면 이곳에 사진 달력으로 쌓여요.</p>
            <button type="button" className="r-button r-button--primary r-button--pill" onClick={() => go("register")}>
              첫 기록 남기기
            </button>
          </div>
        ) : view === "calendar" ? (
          <CalendarView
            cursor={cursor}
            byDay={byDay}
            entries={entries}
            selected={selected}
            undatedCount={undated.length}
            onMonth={(step) => {
              setSelected(null);
              setCursor(({ year, month }) => {
                const next = new Date(year, month + step, 1);
                return { year: next.getFullYear(), month: next.getMonth() };
              });
            }}
            onSelect={(key) => setSelected((current) => (current === key ? null : key))}
            onShowList={() => setView("list")}
          />
        ) : view === "photo" ? (
          <div className="r-me-photos">
            {entries.map((entry) => (
              <button
                type="button"
                key={entry.place.id}
                className="r-me-photos__item"
                onClick={() => go("place", entry.place.id)}
                aria-label={`${entry.place.name}${entry.date ? `, ${formatDay(entry.date)}` : ""}`}
              >
                <MeThumb place={entry.place} photo={entry.photo} />
                <span>{entry.place.name}</span>
              </button>
            ))}
          </div>
        ) : (
          <ListView entries={entries} />
        )}
      </div>
    </main>
  );
}

function CalendarView({
  cursor,
  byDay,
  entries,
  selected,
  undatedCount,
  onMonth,
  onSelect,
  onShowList,
}: {
  cursor: { year: number; month: number };
  byDay: Map<string, DiaryEntry[]>;
  entries: DiaryEntry[];
  selected: string | null;
  undatedCount: number;
  onMonth: (step: number) => void;
  onSelect: (key: string) => void;
  onShowList: () => void;
}) {
  const { year, month } = cursor;
  const today = new Date();
  const todayKey = dayKey(today);
  const isCurrentMonth = sameMonth(today, year, month);
  const leading = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const monthEntries = entries.filter((entry) => entry.date && sameMonth(entry.date, year, month));
  const selectedEntries = selected ? byDay.get(selected) ?? [] : [];
  const selectedDate = selected ? selectedEntries[0]?.date ?? null : null;

  return (
    <>
      <div className="r-me-month">
        <button type="button" className="r-icon-button" onClick={() => onMonth(-1)} aria-label="지난달">
          <Icon name="back" />
        </button>
        <b className="r-display" aria-live="polite">{year}년 {month + 1}월</b>
        <button type="button" className="r-icon-button" onClick={() => onMonth(1)} aria-label="다음 달" disabled={isCurrentMonth}>
          <Icon name="chevron" />
        </button>
      </div>
      <div className="r-card r-me-calendar">
        <div className="r-me-calendar__weekdays" aria-hidden="true">
          {WEEKDAYS.map((name) => <span key={name}>{name}</span>)}
        </div>
        <div className="r-me-calendar__grid">
          {Array.from({ length: leading }, (_, index) => <span key={`blank-${index}`} />)}
          {Array.from({ length: days }, (_, index) => {
            const date = new Date(year, month, index + 1);
            const key = dayKey(date);
            const dayEntries = byDay.get(key);
            const state = `${key === todayKey ? " is-today" : ""}${key === selected ? " is-selected" : ""}`;
            if (!dayEntries) return <span key={key} className={`r-me-day${state}`}>{index + 1}</span>;
            return (
              <button
                type="button"
                key={key}
                className={`r-me-day r-me-day--photo${state}`}
                aria-pressed={key === selected}
                aria-label={`${formatDay(date)} 기록 ${dayEntries.length}곳`}
                onClick={() => onSelect(key)}
              >
                <MeThumb place={dayEntries[0].place} photo={dayEntries[0].photo} />
                <span className="r-me-day__num">{index + 1}</span>
                {dayEntries.length > 1 && <span className="r-me-day__count">{dayEntries.length}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate ? (
        <section className="r-me-section">
          <div className="r-section-head">
            <h2>{formatDay(selectedDate)}</h2>
            <button type="button" onClick={() => onSelect(selected ?? "")}>이달 기록 모두 보기</button>
          </div>
          {selectedEntries.map((entry) => <DiaryEntryCard key={entry.place.id} entry={entry} />)}
        </section>
      ) : (
        <section className="r-me-section">
          <div className="r-section-head"><h2>{month + 1}월 기록 {monthEntries.length}곳</h2></div>
          {monthEntries.length ? (
            monthEntries.map((entry) => <DiaryEntryCard key={entry.place.id} entry={entry} />)
          ) : (
            <p className="r-me-note r-muted">이 달에는 남긴 기록이 없어요.</p>
          )}
        </section>
      )}

      {undatedCount > 0 && (
        <button type="button" className="r-me-note r-me-note--link" onClick={onShowList}>
          기록 날짜가 없는 {undatedCount}곳은 목록에서 볼 수 있어요
          <Icon name="chevron" />
        </button>
      )}
    </>
  );
}

function ListView({ entries }: { entries: DiaryEntry[] }) {
  // 월별로 묶고, 날짜가 없는 기록은 맨 아래에 따로 둡니다.
  const groups: { title: string; items: DiaryEntry[] }[] = [];
  for (const entry of entries) {
    const title = entry.date ? `${entry.date.getFullYear()}년 ${entry.date.getMonth() + 1}월` : "날짜 없는 기록";
    const last = groups.at(-1);
    if (last?.title === title) last.items.push(entry);
    else groups.push({ title, items: [entry] });
  }
  return (
    <>
      {groups.map((group) => (
        <section className="r-me-section" key={group.title}>
          <div className="r-section-head"><h2>{group.title}</h2><span className="r-muted r-me-count">{group.items.length}곳</span></div>
          {group.items.map((entry) => <DiaryEntryCard key={entry.place.id} entry={entry} showRelative />)}
        </section>
      ))}
    </>
  );
}
