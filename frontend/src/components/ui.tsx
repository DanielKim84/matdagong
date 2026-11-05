/** 화면들이 함께 쓰는 작은 공통 부품(상단 바, 알림 버튼, 탭 전환, 섹션 제목, 빈 화면, 불러오는 중)입니다. */
import type { ReactNode } from "react";
import { useAppData } from "../app/AppData";
import { back, go } from "../app/navigation";
import type { Screen } from "../models/place";
import Icon, { type IconName } from "./Icon";

type TopBarProps = {
  title: string;
  /** 탭 첫 화면이면 뒤로 버튼 없이 큰 제목을 씁니다. */
  root?: boolean;
  /** 앱 안 이전 화면이 없을 때 뒤로 버튼이 갈 화면 */
  fallback?: Screen;
  right?: ReactNode;
  /** float: 큰 사진 위에 떠 있는 바(상세·프로필). 바탕 없이 둥근 버튼만 보이고, isScrolled면 바탕과 제목이 나타납니다. */
  variant?: "default" | "float";
  isScrolled?: boolean;
};

/** 화면 상단 바(뒤로 버튼 + 제목 + 오른쪽 칸)입니다. */
export function TopBar({
  title,
  root = false,
  fallback = "home",
  right,
  variant = "default",
  isScrolled = false,
}: TopBarProps) {
  const backButton = !root && (
    <button
      type="button"
      className={`r-icon-button ${variant === "float" ? "r-icon-button--float" : ""}`}
      onClick={() => back(fallback)}
      aria-label="이전 화면으로 돌아가기"
    >
      <Icon name="back" />
    </button>
  );
  if (variant === "float") {
    // 높이 0인 sticky 틀 안에 바를 겹쳐 두어 아래 큰 사진을 밀어내지 않습니다.
    return (
      <div className={`r-topbar-float ${isScrolled ? "is-scrolled" : ""}`}>
        <header className="r-topbar r-topbar--float">
          {backButton}
          <b className="r-topbar__title" aria-hidden={!isScrolled}>
            {title}
          </b>
          {right}
        </header>
      </div>
    );
  }
  return (
    <header className={`r-topbar ${root ? "r-topbar--root" : ""}`}>
      {backButton}
      <h1>{title}</h1>
      {right}
    </header>
  );
}

/** 상단 바에 두는 알림 버튼입니다. 읽지 않은 알림이 있으면 점을 표시합니다. */
export function NotificationButton({ isFloating = false }: { isFloating?: boolean }) {
  const { unread } = useAppData();
  return (
    <button
      type="button"
      className={`r-icon-button ${isFloating ? "r-icon-button--float" : ""}`}
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

type SectionHeadProps = {
  title: ReactNode;
  /** 오른쪽 글자 버튼 이름. onAction과 함께 줍니다. */
  action?: string;
  onAction?: () => void;
  /** 오른쪽에 흐리게 보일 보조 정보("3건", "1 / 5") */
  meta?: ReactNode;
  /** 오른쪽 자유 칸(직접 만든 버튼 등). meta·action 뒤에 놓입니다. */
  children?: ReactNode;
  /** 제목(h2)의 id. 섹션에 aria-labelledby로 연결할 때 씁니다. */
  titleId?: string;
  className?: string;
};

/** 섹션 제목과 오른쪽 칸(보조 정보·글자 버튼·자유 칸)입니다. */
export function SectionHead({ title, action, onAction, meta, children, titleId, className = "" }: SectionHeadProps) {
  return (
    <div className={`r-section-head ${className}`}>
      <h2 id={titleId}>{title}</h2>
      {meta != null && meta !== false && <span className="r-section-head__meta">{meta}</span>}
      {action && onAction && (
        <button type="button" onClick={onAction}>
          {action}
        </button>
      )}
      {children}
    </div>
  );
}

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
  /** 둥근 버튼 모양. action은 기본 secondary입니다. */
  variant?: "primary" | "secondary" | "soft";
};

export type EmptyStateProps = {
  icon?: IconName;
  title: string;
  message?: ReactNode;
  /** 주 버튼(기본은 둥근 보조 버튼 모양). 오류 화면은 "다시 불러오기"를 씁니다. */
  action?: EmptyStateAction;
  /** 두 번째 버튼. variant를 주지 않으면 글자 버튼입니다. */
  secondaryAction?: EmptyStateAction;
  /** error면 role="alert", loading이면 role="status"로 읽어 줍니다. */
  tone?: "empty" | "error" | "loading";
  /** 문구와 버튼 사이에 넣을 내용(추천 목록 등) */
  children?: ReactNode;
  className?: string;
};

/** 빈 화면·오류·불러오는 중 안내입니다. 목록 자리나 카드 안에 그대로 둡니다. */
export function EmptyState({
  icon,
  title,
  message,
  action,
  secondaryAction,
  tone = "empty",
  children,
  className = "",
}: EmptyStateProps) {
  const role = tone === "error" ? "alert" : tone === "loading" ? "status" : undefined;
  return (
    <div className={`r-empty r-empty--${tone} ${className}`} role={role}>
      {icon && (
        <span className="r-badge-icon r-empty__icon" aria-hidden="true">
          <Icon name={icon} />
        </span>
      )}
      <b>{title}</b>
      {message && <p>{message}</p>}
      {children}
      {action && (
        <button
          type="button"
          className={`r-button r-button--${action.variant ?? "secondary"} r-button--pill`}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
      {secondaryAction && (
        <button
          type="button"
          className={
            secondaryAction.variant ? `r-button r-button--${secondaryAction.variant} r-button--pill` : "r-text-button"
          }
          onClick={secondaryAction.onClick}
        >
          {secondaryAction.label}
        </button>
      )}
    </div>
  );
}

/**
 * 불러오는 중 자리 표시입니다. row는 목록 한 줄(64px), card는 카드(120px), line은 글 한 줄 높이입니다.
 * 화면 읽기 프로그램에는 label 한 번만 읽어 줍니다.
 */
export function Skeleton({
  shape = "row",
  count = 1,
  label = "불러오고 있어요.",
  className = "",
}: {
  shape?: "row" | "card" | "line";
  count?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`r-skeleton-group ${className}`} aria-busy="true">
      {Array.from({ length: count }, (_, index) => (
        <span key={index} className={`r-skeleton r-skeleton--${shape}`} aria-hidden="true" />
      ))}
      <p className="visually-hidden" role="status">
        {label}
      </p>
    </div>
  );
}
