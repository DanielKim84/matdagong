import Icon from "../../components/Icon";
import TasteScore from "../../components/TasteScore";
import TasterAvatar from "../../components/TasterAvatar";
import { isMyTaster } from "../../models/place";
import type { PlaceRecord } from "./placeRecords";

/**
 * "맛객의 추천 이유"의 맛객 바꾸기 줄(보드 09-02): 가운데 고른 맛객(큰 얼굴 · 이름 · 신뢰·취향), 양옆 ‹ › 동그라미 버튼입니다.
 * 바꾸면 아래 이야기·태그·대표 메뉴와 위 큰 사진이 그 맛객 것으로 바뀝니다. 맛객이 한 명이면 화살표를 두지 않습니다.
 */
export default function PlaceTasterSwitcher({
  records,
  selectedIndex,
  onSelect,
}: {
  records: PlaceRecord[];
  selectedIndex: number;
  onSelect: (tasterId: string) => void;
}) {
  const record = records[selectedIndex];
  const hasMany = records.length > 1;
  const move = (step: number) => onSelect(records[(selectedIndex + step + records.length) % records.length].tasterId);
  return (
    <div className="r-place-switcher">
      {hasMany && (
        <button type="button" className="r-place-switcher__arrow" onClick={() => move(-1)} aria-label="이전 맛객">
          <Icon name="back" />
        </button>
      )}
      <div className="r-place-switcher__who" aria-live="polite">
        <TasterAvatar taster={record} />
        <span>
          <b>{isMyTaster(record) ? "내 기록" : record.tasterName}</b>
          {!isMyTaster(record) && <TasteScore taster={record} />}
        </span>
      </div>
      {hasMany && (
        <button type="button" className="r-place-switcher__arrow" onClick={() => move(1)} aria-label="다음 맛객">
          <Icon name="chevron" />
        </button>
      )}
    </div>
  );
}
