import type { ReactNode } from "react";
import Icon from "./Icon";
import Sheet from "./Sheet";
import { PageIntro } from "./ui";

/**
 * 화면 위에 꽉 차게 덮어 여는 하위 화면입니다(보드 05-02 지역 선택, 05-03 필터, 05-04 마커 안내, 06-02 지도 목록 등).
 * 위쪽은 하위 화면 공통 바(뒤로 · 가운데 제목 · 오른쪽 칸, TopBar r-topbar--center와 같은 모양), 가운데는 스크롤되는 본문,
 * footer가 있으면 아래에 붙는 버튼 줄입니다. 열고 닫는 동작(스크롤 잠금·Esc·포커스 가두기)은 Sheet와 같고, 뒤로 버튼이 onClose입니다.
 * 주소(해시)를 바꾸지 않는 창이라, 그 화면의 상태(고르던 필터 등)를 그대로 들고 열고 닫습니다.
 * intro가 있으면(보드 10-04 가게 정보 제보처럼) 바에는 뒤로 버튼만 두고, 본문 맨 위에 큰 제목과 그 설명을 둡니다.
 */
export default function SubScreen({
  title,
  onClose,
  right,
  footer,
  intro,
  children,
  className = "",
}: {
  title: string;
  /** 큰 제목 아래 설명. 주면 제목을 바 가운데 대신 본문 위에 크게 둡니다. */
  intro?: ReactNode;
  onClose: () => void;
  /** 제목 오른쪽 칸("초기화" 등). 없으면 같은 폭 빈 칸을 둬 제목을 가운데 맞춥니다. */
  right?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Sheet
      title={title}
      onClose={onClose}
      variant="plain"
      backdropClassName="r-subscreen-backdrop"
      className={`r-subscreen ${className}`}
      header={
        <header className={`r-topbar r-topbar--center r-subscreen__bar ${intro ? "is-plain" : ""}`}>
          <button type="button" className="r-icon-button" onClick={onClose} aria-label="이전 화면으로 돌아가기">
            <Icon name="back" />
          </button>
          {intro ? <span className="r-topbar__fill" aria-hidden="true" /> : <h1>{title}</h1>}
          {right ?? <span className="r-topbar__spacer" aria-hidden="true" />}
        </header>
      }
    >
      <div className="r-subscreen__body">
        {intro && <PageIntro title={title} message={intro} />}
        {children}
      </div>
      {footer && <div className="r-subscreen__footer">{footer}</div>}
    </Sheet>
  );
}
