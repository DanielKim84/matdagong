/** 화면들이 함께 쓰는 작은 공통 부품(상단 바, 알림 버튼, 탭 전환, 섹션 제목, 빈 화면, 불러오는 중)입니다. */
import type { ReactNode } from "react";
import { useAppData } from "../app/AppData";
import { back, go } from "../app/navigation";
import type { Screen } from "../models/place";
import Icon, { type IconName } from "./Icon";

type TopBarProps = {
  title: string;
  /** 앱 안 이전 화면이 없을 때 뒤로 버튼이 갈 화면 */
  fallback?: Screen;
  right?: ReactNode;
  /** 제목 바로 옆에 붙일 작은 칸(맛객 탭의 지역 버튼 등). 기본 바에서만 씁니다. */
  aside?: ReactNode;
  /** 탭 첫 화면(발견·피드·맛객)에서 제목 글자 대신 맛다공 로고를 보여 줍니다. 제목은 로고의 대체 글자로 읽습니다. */
  isBrand?: boolean;
  /** plain: 뒤로 버튼(과 오른쪽 칸)만 있는 바(보드 14·16처럼 제목을 본문 위 PageIntro에 크게 두는 화면). 제목은 화면 읽기용으로만 둡니다. */
  variant?: "default" | "plain";
};

/** 화면 상단 바(뒤로 버튼 + 제목 + 오른쪽 칸)입니다. */
export function TopBar({ title, fallback = "home", right, aside, isBrand = false, variant = "default" }: TopBarProps) {
  const backButton = (
    <button type="button" className="r-icon-button" onClick={() => back(fallback)} aria-label="이전 화면으로 돌아가기">
      <Icon name="back" />
    </button>
  );
  if (variant === "plain") {
    return (
      <header className="r-topbar r-topbar--plain">
        {backButton}
        <h1 className="visually-hidden">{title}</h1>
        <span className="r-topbar__fill" aria-hidden="true" />
        {right}
      </header>
    );
  }
  if (isBrand) {
    return (
      <header className="r-topbar r-topbar--brand">
        <h1>
          <img className="r-topbar__logo" src="/assets/brand/brand-logo-flat.png" alt={title} />
        </h1>
        {right}
      </header>
    );
  }
  // 하위 화면은 보드처럼 제목을 가운데 둡니다. 오른쪽 칸이 없으면 뒤로 버튼만큼 빈 칸을 둬 제목이 정확히 가운데 오게 합니다.
  const isCentered = !aside;
  return (
    <header className={`r-topbar ${isCentered ? "r-topbar--center" : ""}`}>
      {backButton}
      {aside ? (
        <div className="r-topbar__heading">
          <h1>{title}</h1>
          {aside}
        </div>
      ) : (
        <h1>{title}</h1>
      )}
      {right ?? (isCentered && <span className="r-topbar__spacer" aria-hidden="true" />)}
    </header>
  );
}

/**
 * 하위 화면 본문 맨 위의 큰 제목과 한 줄 설명입니다(보드 13-02 "가볼 곳 24곳", 14 "최근 본 곳", 16 "포인트 지갑").
 * 위쪽 바의 가운데 제목은 작게, 이 제목은 크게 둬 어떤 화면인지 바로 읽히게 합니다. icon은 제목 앞 코랄 아이콘입니다.
 */
export function PageIntro({ title, message, icon }: { title: ReactNode; message?: ReactNode; icon?: IconName }) {
  return (
    <div className="r-page-intro">
      <h2 className="r-home-title">
        {icon && <Icon name={icon} filled={icon === "heart"} />}
        {title}
      </h2>
      {message && <p>{message}</p>}
    </div>
  );
}

/** 상단 바에 두는 알림 버튼입니다. 읽지 않은 알림이 있으면 점을 표시합니다. */
export function NotificationButton() {
  const { hasUnread } = useAppData();
  return (
    <button
      type="button"
      className="r-icon-button"
      onClick={() => go("notifications")}
      aria-label={hasUnread ? "알림, 읽지 않은 알림 있음" : "알림"}
    >
      <Icon name="bell" />
      {hasUnread && <i className="r-icon-button__dot" aria-hidden="true" />}
    </button>
  );
}

/**
 * 탭 전환입니다. 선택 상태는 aria-selected로 표시합니다.
 * 기본은 회색 틀 안 알약(보드 06-02 "추천순 | 가까운 순"), underline은 글자 아래 코랄 밑줄 탭(보드 05-02 "시/도 선택 | 구/군 선택")입니다.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  variant = "pill",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  label: string;
  variant?: "pill" | "underline";
}) {
  return (
    <div
      className={`r-segmented ${variant === "underline" ? "r-segmented--underline" : ""}`}
      role="tablist"
      aria-label={label}
    >
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
  /** 오른쪽 칸(칩·글자 버튼 등) */
  children?: ReactNode;
  /** 제목(h2)의 id. 섹션에 aria-labelledby로 연결할 때 씁니다. */
  titleId?: string;
  className?: string;
};

/** 섹션 제목과 오른쪽 칸입니다. */
export function SectionHead({ title, children, titleId, className = "" }: SectionHeadProps) {
  return (
    <div className={`r-section-head ${className}`}>
      <h2 id={titleId}>{title}</h2>
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
    <div className={`r-empty ${className}`} role={role}>
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
  label,
  className = "",
}: {
  shape?: "row" | "card" | "line";
  count?: number;
  label: string;
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
