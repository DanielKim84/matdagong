import { useState } from "react";
import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import { isTrustedTaster } from "../../models/trust";
import PlaceTasterListSheet from "./PlaceTasterListSheet";
import TasterAvatar from "../../components/TasterAvatar";
import { recordBadge, type PlaceRecord } from "./placeRecords";

/** 줄에 바로 보여 줄 맛객 수. 더 많으면 끝에 "전체 N명" 버튼으로 목록 시트를 엽니다. */
const VISIBLE_COUNT = 6;

/**
 * 이 맛집을 기록한 맛객 고르기. 맛객마다 메뉴·태그·매장 정보가 다르므로 한 번에 한 맛객의 기록만 보여 줍니다.
 * 고른 맛객의 기록 패널(`PlaceTasterRecord`)과 탭/탭패널 관계로 연결됩니다.
 */
export default function PlaceTasterPicker({
  records,
  selectedId,
  panelId,
  onSelect,
}: {
  records: PlaceRecord[];
  selectedId: string;
  panelId: string;
  onSelect: (tasterId: string) => void;
}) {
  const { subscriptionIds } = useAppData();
  const [isListOpen, setIsListOpen] = useState(false);
  const hasMore = records.length > VISIBLE_COUNT;
  const visible = records.slice(0, VISIBLE_COUNT);
  // 목록 시트에서 고른 맛객이 앞쪽에 없으면 맨 앞에 보여 줘 지금 누구 기록인지 줄에서도 알 수 있게 합니다.
  const selected = records.find((record) => record.tasterId === selectedId);
  if (selected && !visible.includes(selected)) visible.unshift(selected);

  return (
    <>
      {/* 가로로 넘기는 한 줄: 맛객 탭들 + (많으면) 전체 목록 버튼 */}
      <div className="r-place-picker">
        <div className="r-place-picker__tabs" role="tablist" aria-label="기록을 볼 맛객">
          {visible.map((record) => {
            const isSelected = record.tasterId === selectedId;
            const badge = recordBadge(record, subscriptionIds);
            return (
              <button
                key={record.tasterId}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls={panelId}
                className={`r-place-picker__item ${isSelected ? "is-selected" : ""}`}
                onClick={() => onSelect(record.tasterId)}
              >
                <TasterAvatar taster={record} />
                <b>{record.tasterName}</b>
                {badge && <small className={isTrustedTaster(record) ? "is-trusted" : ""}>{badge}</small>}
              </button>
            );
          })}
        </div>
        {hasMore && (
          <button
            type="button"
            className="r-place-picker__item r-place-picker__all"
            onClick={() => setIsListOpen(true)}
            aria-haspopup="dialog"
          >
            <span className="r-place-picker__all-icon" aria-hidden="true">
              <Icon name="user" />
            </span>
            <b>전체 {records.length}명</b>
            <small>목록 보기</small>
          </button>
        )}
      </div>
      {isListOpen && (
        <PlaceTasterListSheet
          records={records}
          selectedId={selectedId}
          onSelect={onSelect}
          onClose={() => setIsListOpen(false)}
        />
      )}
    </>
  );
}
