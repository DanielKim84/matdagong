import { useState } from "react";
import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import Sheet from "../../components/Sheet";
import { Segmented } from "../../components/ui";
import { compareByTrust } from "../../models/trust";
import { formatMonthDay, parseTime } from "../../utils/format";
import TasterAvatar from "../../components/TasterAvatar";
import { recordBadge, recordMenus, type PlaceRecord } from "./placeRecords";

type SortOrder = "recommended" | "match" | "recent";

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "recommended", label: "추천순" },
  { value: "match", label: "신뢰·취향 순" },
  { value: "recent", label: "최근 기록 순" },
];

/** 이름을 찾는 칸은 맛객이 이만큼 넘을 때만 보여 줍니다. */
const SEARCH_MIN_COUNT = 10;

function sortRecords(records: PlaceRecord[], order: SortOrder): PlaceRecord[] {
  // 추천순은 상세 화면이 정한 순서(내 기록 → 구독 → 신뢰·취향 점수) 그대로입니다.
  if (order === "recommended") return records;
  return [...records].sort((left, right) =>
    order === "match"
      ? compareByTrust(left, right)
      : (parseTime(right.recordedAt) ?? 0) - (parseTime(left.recordedAt) ?? 0),
  );
}

function photoCount(record: PlaceRecord): number {
  return (record.photos?.length ?? 0) + recordMenus(record).filter((menu) => menu.photo).length;
}

/** 맛객이 많을 때 여는 전체 맛객 목록. 정렬·이름 찾기로 고르고, 고르면 닫힙니다. */
export default function PlaceTasterListSheet({
  records,
  selectedId,
  onSelect,
  onClose,
}: {
  records: PlaceRecord[];
  selectedId: string;
  onSelect: (tasterId: string) => void;
  onClose: () => void;
}) {
  const { subscriptionIds } = useAppData();
  const [order, setOrder] = useState<SortOrder>("recommended");
  const [query, setQuery] = useState("");
  const keyword = query.trim().toLowerCase();
  const shown = sortRecords(records, order).filter(
    (record) => !keyword || record.tasterName.toLowerCase().includes(keyword),
  );

  function select(tasterId: string) {
    onSelect(tasterId);
    onClose();
  }

  return (
    <Sheet title={`이 맛집을 기록한 맛객 ${records.length}명`} onClose={onClose} className="r-place-taster-sheet">
      <Segmented value={order} options={SORT_OPTIONS} onChange={setOrder} label="맛객 정렬" />
      {records.length > SEARCH_MIN_COUNT && (
        <label className="r-place-taster-sheet__search">
          <Icon name="search" />
          <span className="visually-hidden">맛객 이름 찾기</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="맛객 이름 찾기"
          />
        </label>
      )}
      {shown.length > 0 ? (
        <ul className="r-place-taster-sheet__list">
          {shown.map((record) => {
            const isSelected = record.tasterId === selectedId;
            const badge = recordBadge(record, subscriptionIds);
            const recordedOn = formatMonthDay(record.recordedAt);
            const summary = [
              recordedOn && `${recordedOn} 기록`,
              `메뉴 ${recordMenus(record).length}`,
              `사진 ${photoCount(record)}`,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={record.tasterId}>
                <button
                  type="button"
                  className={`r-place-taster-sheet__row ${isSelected ? "is-selected" : ""}`}
                  aria-current={isSelected}
                  onClick={() => select(record.tasterId)}
                >
                  <TasterAvatar taster={record} />
                  <span className="r-place-taster-sheet__copy">
                    <span className="r-place-taster-sheet__name">
                      <b>{record.tasterName}</b>
                      {badge && <em>{badge}</em>}
                    </span>
                    <small>{summary}</small>
                  </span>
                  {isSelected && <Icon name="check" />}
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="r-place-taster-sheet__empty">‘{query.trim()}’ 맛객을 찾지 못했어요.</p>
      )}
    </Sheet>
  );
}
