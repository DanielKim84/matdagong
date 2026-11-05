import { useState } from "react";
import { go } from "../app/navigation";
import Icon from "./Icon";
import QuickPlaceSheet from "./QuickPlaceSheet";
import Sheet from "./Sheet";

/**
 * 떠 있는 "+ 기록하기" 버튼과, 누르면 여는 "맛집 기록하기 / 빠른 저장" 메뉴입니다.
 * 내가 가 본 곳을 남기는 동작이라 내 지도 화면에 둡니다. 자리(위치)는 부르는 쪽 className이 정합니다.
 */
export default function RecordMenuButton({ className = "" }: { className?: string }) {
  const [isRecordMenuOpen, setIsRecordMenuOpen] = useState(false);
  const [isQuickOpen, setIsQuickOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`r-record-fab ${className}`}
        aria-label="기록하기"
        onClick={() => setIsRecordMenuOpen(true)}
      >
        <Icon name="plus" />
        <span>기록하기</span>
      </button>
      {isRecordMenuOpen && (
        <Sheet title="무엇을 남길까요?" onClose={() => setIsRecordMenuOpen(false)} className="r-record-menu">
          <div className="r-record-menu__list">
            <button
              type="button"
              className="r-card r-record-menu__item"
              onClick={() => {
                setIsRecordMenuOpen(false);
                go("register");
              }}
            >
              <span className="r-record-menu__icon is-strong">
                <Icon name="fork" />
              </span>
              <span className="r-record-menu__copy">
                <b>맛집 기록하기</b>
                <small>다녀온 곳의 추천 이유와 사진</small>
              </span>
              <Icon name="chevron" />
            </button>
            <button
              type="button"
              className="r-card r-record-menu__item"
              onClick={() => {
                setIsRecordMenuOpen(false);
                setIsQuickOpen(true);
              }}
            >
              <span className="r-record-menu__icon">
                <Icon name="pin" />
              </span>
              <span className="r-record-menu__copy">
                <b>빠른 저장</b>
                <small>장소만 먼저 남기고 나중에 완성</small>
              </span>
              <Icon name="chevron" />
            </button>
          </div>
        </Sheet>
      )}
      {isQuickOpen && <QuickPlaceSheet onClose={() => setIsQuickOpen(false)} />}
    </>
  );
}
