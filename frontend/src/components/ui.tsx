import type { ReactNode } from "react";
import { back, go } from "../app/navigation";
import type { Screen } from "../models/place";
import { useAppData } from "../app/AppData";
import Icon from "./Icon";

/** 리뉴얼 화면의 상단 바입니다. root면 뒤로 버튼 없이 큰 제목을 씁니다. */
export function TopBar({
  title,
  root = false,
  fallback = "home",
  right,
}: {
  title: string;
  root?: boolean;
  fallback?: Screen;
  right?: ReactNode;
}) {
  return (
    <header className={`r-topbar ${root ? "r-topbar--root" : ""}`}>
      {!root && (
        <button type="button" className="r-icon-button" onClick={() => back(fallback)} aria-label="이전 화면으로 돌아가기">
          <Icon name="back" />
        </button>
      )}
      <h1>{title}</h1>
      {right}
    </header>
  );
}

/** 상단 바에 두는 알림 버튼입니다. 읽지 않은 알림이 있으면 점을 표시합니다. */
export function NotificationButton({ floating = false }: { floating?: boolean }) {
  const { unread } = useAppData();
  return (
    <button
      type="button"
      className={`r-icon-button ${floating ? "r-icon-button--float" : ""}`}
      onClick={() => go("notifications")}
      aria-label={unread ? "알림, 읽지 않은 알림 있음" : "알림"}
    >
      <Icon name="bell" />
      {unread && <i className="r-icon-button__dot" aria-hidden="true" />}
    </button>
  );
}

/** 탭 전환입니다. 선택 상태는 aria-selected로 표시합니다. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
}) {
  return (
    <div className="r-segmented" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** 섹션 제목과 오른쪽 링크입니다. */
export function SectionHead({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="r-section-head">
      <h2>{title}</h2>
      {action && onAction && <button type="button" onClick={onAction}>{action}</button>}
    </div>
  );
}

/** "3시간 전", "어제", "10월 26일"처럼 기록 시각을 짧게 보여 줍니다. 값이 없으면 빈 문자열입니다. */
export function relativeTime(value?: string | null): string {
  if (!value) return "";
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return "";
  const minutes = Math.floor((Date.now() - time) / 60_000);
  if (minutes < 1) return "방금";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "어제";
  if (days < 7) return `${days}일 전`;
  return new Date(time).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
}
