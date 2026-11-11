import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Icon, { type IconName } from "../../components/Icon";
import Sheet from "../../components/Sheet";
import { NEARBY_RADIUS_KM, type BrowseSort, type TasterFocusFilter, type TasterScope } from "./tasterData";
import type { OnDemandLocation } from "./useOnDemandLocation";

const FOCUS_OPTIONS: { value: TasterFocusFilter; label: string }[] = [
  { value: "ALL", label: "전체" },
  { value: "RESTAURANT", label: "식당" },
  { value: "CAFE_DESSERT", label: "카페·디저트" },
];

const SCOPE_OPTIONS: { value: TasterScope; label: string; icon: IconName }[] = [
  { value: "ALL", label: "전체 지역", icon: "map" },
  { value: "NEARBY", label: "내 주변", icon: "locate" },
  { value: "MY_AREA", label: "내 지역", icon: "pin" },
  { value: "TRAVEL", label: "여행·드라이브", icon: "route" },
];

/** 지역 고르기 시트에서 이름 아래 붙이는 한 줄 설명입니다. */
function scopeDescription(scope: TasterScope, myArea: string | null): string {
  if (scope === "NEARBY") return `지금 위치 ${NEARBY_RADIUS_KM}km 안에 기록을 남긴 맛객`;
  if (scope === "MY_AREA") return myArea ? `${myArea}에서 활동하는 맛객` : "프로필에 동네를 등록하면 볼 수 있어요";
  if (scope === "TRAVEL") return "여기저기 다니며 기록하는 맛객";
  return "지역 상관없이 모든 맛객";
}

/**
 * 맛객 탭 제목 옆의 지역 버튼: 배달 앱의 주소 고르기처럼 지금 지역을 보여 주고, 누르면 아래에서 지역 고르기 시트가 열립니다.
 * 내 주변은 지금 위치(회사 등), 내 지역은 프로필에 등록한 내 활동 지역(집 등)이라 둘을 따로 둡니다. 내 주변을 고르면 그때 위치를 묻습니다.
 * 아래 "취향이 잘 맞는 맛객"과 "맛객 둘러보기"가 모두 이 지역을 따릅니다.
 */
export function TasterRegionButton({
  scope,
  onScopeChange,
  location,
  myArea,
  hasTravel,
}: {
  scope: TasterScope;
  onScopeChange: (scope: TasterScope) => void;
  location: OnDemandLocation;
  myArea: string | null;
  hasTravel: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const options = SCOPE_OPTIONS.filter((option) => option.value !== "TRAVEL" || hasTravel);
  // 내 지역은 "마포구"처럼 동네 이름으로 보여 줘 어느 지역인지 바로 알 수 있게 합니다.
  const label =
    scope === "MY_AREA" && myArea
      ? (myArea.split(" ")[1] ?? myArea)
      : SCOPE_OPTIONS.find((option) => option.value === scope)?.label;

  function choose(next: TasterScope) {
    onScopeChange(next);
    if (next === "NEARBY") location.ensure();
    setIsOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className={`r-tasters-region ${scope !== "ALL" ? "is-on" : ""}`}
        aria-haspopup="dialog"
        aria-label={`지역 고르기, 지금 ${label}`}
        onClick={() => setIsOpen(true)}
      >
        <Icon name="pin" />
        {label}
        <span className="r-tasters-region__caret" aria-hidden="true">
          <Icon name="chevron" />
        </span>
      </button>
      {/* 버튼이 sticky 위쪽 바 안에 있어 시트가 그 쌓임 순서에 갇히지 않게 body에 그립니다. */}
      {isOpen &&
        createPortal(
          <Sheet title="어느 지역 맛객을 볼까요?" onClose={() => setIsOpen(false)} className="r-tasters-region-sheet">
            <ul className="r-tasters-region-sheet__list">
              {options.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={scope === option.value ? "is-on" : ""}
                    aria-pressed={scope === option.value}
                    onClick={() => choose(option.value)}
                  >
                    <span className="r-tasters-region-sheet__icon">
                      <Icon name={option.icon} />
                    </span>
                    <span className="r-tasters-region-sheet__copy">
                      <b>{option.label}</b>
                      <small>{scopeDescription(option.value, myArea)}</small>
                    </span>
                    {scope === option.value && <Icon name="check" />}
                  </button>
                </li>
              ))}
            </ul>
          </Sheet>,
          document.body,
        )}
    </>
  );
}

/**
 * 맛객 탭의 분야 탭: 전체 · 식당 · 카페·디저트를 밑줄 탭으로 둡니다. 위쪽 구독 줄의 동그란 프로필과 겹쳐 보이지 않게 아이콘 대신 글자 탭입니다.
 * 지역과 마찬가지로 아래 두 섹션이 모두 이 분야를 따릅니다.
 */
export function TasterFocusTabs({
  focus,
  onFocusChange,
}: {
  focus: TasterFocusFilter;
  onFocusChange: (focus: TasterFocusFilter) => void;
}) {
  return (
    <div className="r-tasters-focus" role="tablist" aria-label="분야">
      {FOCUS_OPTIONS.map((option) => (
        <button
          type="button"
          role="tab"
          key={option.value}
          aria-selected={focus === option.value}
          onClick={() => onFocusChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** "카페·디저트 맛객"처럼 고른 분야를 맛객 앞에 붙입니다. 모든 분야면 그냥 "맛객"입니다. */
function focusTaster(focus: TasterFocusFilter): string {
  const label = FOCUS_OPTIONS.find((option) => option.value === focus && focus !== "ALL")?.label;
  return label ? `${label} 맛객` : "맛객";
}

/** 지역 조건을 문장 앞머리로 씁니다("지금 위치 5km 안에서"). */
function scopeLead(scope: TasterScope, myArea: string | null): string {
  if (scope === "NEARBY") return `지금 위치 ${NEARBY_RADIUS_KM}km 안에서`;
  if (scope === "MY_AREA") return `${myArea ?? "내 지역"}에서`;
  if (scope === "TRAVEL") return "여행·드라이브 맛객 중";
  return "지역 상관없이";
}

/**
 * 취향이 잘 맞는 맛객 위 안내 문장입니다. 조건과 인원을 굵게 한 문장으로 말하고, 순서는 짧게 덧붙입니다.
 * 예: "지금 위치 5km 안에서 **나와 입맛이 비슷한 카페·디저트 맛객 7명**이에요. 믿고 가는 맛객부터 보여 드려요."
 */
export function RecommendNote({
  scope,
  focus,
  myArea,
  total,
  limit,
}: {
  scope: TasterScope;
  focus: TasterFocusFilter;
  myArea: string | null;
  total: number;
  limit: number;
}) {
  const count = total > limit ? `${total}명 중 가장 잘 맞는 ${limit}명` : `${total}명`;
  return (
    <Note>
      {scopeLead(scope, myArea)}{" "}
      <b>
        나와 입맛이 비슷한 {focusTaster(focus)} {count}
      </b>
      이에요. 믿고 가는 맛객부터 보여 드려요.
    </Note>
  );
}

const SORT_NOTES: Record<BrowseSort, string> = {
  SUBSCRIBERS: "구독자가 많은 맛객부터 보여 드려요.",
  TASTE: "믿고 가는 맛객, 취향이 잘 맞는 맛객부터 보여 드려요.",
  RECORDS: "기록을 많이 남긴 맛객부터 보여 드려요.",
};

/**
 * 맛객 둘러보기 위 안내 문장입니다. 어떤 맛객이 몇 명인지 굵게 말하고, 고른 정렬을 짧게 덧붙입니다.
 * 예: "지금 위치 5km 안에 **기록을 남긴 식당 맛객 8명**이에요. 그 안에 기록을 많이 남긴 맛객부터 보여 드려요."
 */
export function BrowseNote({
  scope,
  focus,
  sort,
  myArea,
  total,
}: {
  scope: TasterScope;
  focus: TasterFocusFilter;
  sort: BrowseSort;
  myArea: string | null;
  total: number;
}) {
  const who = `${focusTaster(focus)} ${total}명`;
  const isAreaScope = scope === "NEARBY" || scope === "MY_AREA";
  const sortNote =
    sort === "RECORDS" && isAreaScope ? "그 안에 기록을 많이 남긴 맛객부터 보여 드려요." : SORT_NOTES[sort];
  const lead: Record<TasterScope, ReactNode> = {
    ALL: (
      <>
        지역 상관없이 <b>{who}</b>이 있어요.
      </>
    ),
    NEARBY: (
      <>
        지금 위치 {NEARBY_RADIUS_KM}km 안에 <b>기록을 남긴 {who}</b>이에요.
      </>
    ),
    MY_AREA: (
      <>
        {myArea ?? "내 지역"}에 <b>기록을 남기거나 활동하는 {who}</b>이에요.
      </>
    ),
    TRAVEL: (
      <>
        <b>여행·드라이브를 다니는 {who}</b>이에요.
      </>
    ),
  };
  return (
    <Note>
      {lead[scope]} {sortNote}
    </Note>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="r-tasters-note">{children}</p>;
}
