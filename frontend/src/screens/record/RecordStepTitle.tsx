import type { ReactNode } from "react";

/** 기록하기 각 단계 맨 위의 큰 질문과 짧은 안내입니다. */
export default function RecordStepTitle({ children, lead }: { children: ReactNode; lead?: string }) {
  return (
    <div className="r-record-title">
      <h1 className="r-display">{children}</h1>
      {lead && <p className="r-muted">{lead}</p>}
    </div>
  );
}
