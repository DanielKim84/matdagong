import { useState } from "react";
import { createPortal } from "react-dom";
import Icon, { type IconName } from "../../components/Icon";
import Sheet from "../../components/Sheet";
import { NEARBY_RADIUS_KM, type TasterFocusFilter, type TasterScope } from "./tasterData";
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
 * 맛객 탭의 "활동 지역 ▾" 칩(보드 08-01): 지금 지역을 보여 주고, 누르면 아래에서 지역 고르기 시트가 열립니다.
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
  // 내 지역은 "마포구"처럼 동네 이름으로 보여 줘 어느 지역인지 바로 알 수 있게 합니다. 여러 곳이면 "마포구 외 1"입니다.
  const areas = myArea?.split(" · ") ?? [];
  const label =
    scope === "MY_AREA" && myArea
      ? areas.length > 1
        ? `${areas[0]} 외 ${areas.length - 1}`
        : myArea
      : scope === "ALL"
        ? "활동 지역"
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
        className={`r-chip ${scope !== "ALL" ? "is-on" : ""}`}
        aria-haspopup="dialog"
        aria-label={`지역 고르기, 지금 ${label}`}
        onClick={() => setIsOpen(true)}
      >
        {label}
        <Icon name="chevron-down" />
      </button>
      {/* 칩 줄이 가로로 넘기는 영역이라 시트가 그 안에 갇히지 않게 body에 그립니다. */}
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
 * 맛객 탭의 "분야 ▾" 칩(보드 08-01): 누르면 전체 · 식당 · 카페·디저트를 고르는 시트가 열립니다. 전체가 아니면 칩에 고른 분야가 보입니다.
 * 지역과 마찬가지로 아래 두 섹션이 모두 이 분야를 따릅니다.
 */
export function TasterFocusChip({
  focus,
  onFocusChange,
}: {
  focus: TasterFocusFilter;
  onFocusChange: (focus: TasterFocusFilter) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const label = focus === "ALL" ? "분야" : FOCUS_OPTIONS.find((option) => option.value === focus)?.label;
  return (
    <>
      <button
        type="button"
        className={`r-chip ${focus !== "ALL" ? "is-on" : ""}`}
        aria-haspopup="dialog"
        aria-label={`분야 고르기, 지금 ${FOCUS_OPTIONS.find((option) => option.value === focus)?.label}`}
        onClick={() => setIsOpen(true)}
      >
        {label}
        <Icon name="chevron-down" />
      </button>
      {isOpen &&
        createPortal(
          <Sheet title="어떤 분야 맛객을 볼까요?" onClose={() => setIsOpen(false)} className="r-tasters-region-sheet">
            <ul className="r-tasters-region-sheet__list">
              {FOCUS_OPTIONS.map((option) => (
                <li key={option.value}>
                  <button
                    type="button"
                    className={focus === option.value ? "is-on" : ""}
                    aria-pressed={focus === option.value}
                    onClick={() => {
                      onFocusChange(option.value);
                      setIsOpen(false);
                    }}
                  >
                    <span className="r-tasters-region-sheet__icon">
                      <Icon
                        name={
                          option.value === "CAFE_DESSERT" ? "coffee" : option.value === "RESTAURANT" ? "fork" : "people"
                        }
                      />
                    </span>
                    <span className="r-tasters-region-sheet__copy">
                      <b>{option.label}</b>
                    </span>
                    {focus === option.value && <Icon name="check" />}
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
