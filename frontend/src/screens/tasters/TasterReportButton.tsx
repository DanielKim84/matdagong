import { useState } from "react";
import { useAppData } from "../../app/AppData";
import TasterReportSheet from "./TasterReportSheet";

/**
 * 맛객 프로필 아래의 "신고하기" 글자 버튼입니다(맛집 기록 단위 신고는 PlaceRecordMenu가 시트를 직접 엽니다).
 * 이미 신고해 확인을 기다리는 맛객이면 다시 누를 수 없게 "신고했어요"로 막습니다.
 */
export default function TasterReportButton({
  tasterId,
  tasterName,
  className = "",
}: {
  tasterId: string;
  tasterName: string;
  className?: string;
}) {
  const app = useAppData();
  const [isOpen, setIsOpen] = useState(false);
  const isReported = app.reportedTasterIds.includes(tasterId);

  return (
    <>
      <button
        type="button"
        className={`r-text-button r-report-button ${className}`.trim()}
        disabled={isReported}
        onClick={() => setIsOpen(true)}
        aria-label={isReported ? `${tasterName} 신고함, 운영팀 확인 중` : `${tasterName} 신고하기`}
      >
        {isReported ? "신고했어요 · 확인 중" : "신고하기"}
      </button>
      {isOpen && <TasterReportSheet tasterId={tasterId} tasterName={tasterName} onClose={() => setIsOpen(false)} />}
    </>
  );
}
