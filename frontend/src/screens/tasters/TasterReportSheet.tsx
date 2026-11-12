import { useState, type FormEvent } from "react";
import { useAppData } from "../../app/AppData";
import Sheet from "../../components/Sheet";
import { ApiError } from "../../services/http";
import type { TasterReportReason } from "../../models/community";
import { errorMessage } from "../../utils/errorMessage";

/** 신고 설명 최대 글자 수. 커뮤니티 서비스 ReportModels.ReportRequest, DB taster_reports.memo(VARCHAR(500))와 같습니다. */
const MEMO_MAX = 500;

const REASONS: { value: TasterReportReason; label: string }[] = [
  { value: "ILLEGAL_PHOTO", label: "불법·음란한 사진" },
  { value: "ADVERTISING", label: "광고·홍보" },
  { value: "ABUSIVE", label: "욕설·불쾌한 표현" },
  { value: "DEFAMATION", label: "비방·사실이 아닌 내용" },
  { value: "IMPERSONATION", label: "다른 사람 사칭" },
  { value: "SPAM", label: "같은 글 도배" },
  { value: "OTHER", label: "기타" },
];

/**
 * 맛객 신고: 프로필이나 맛집 기록에서 엽니다. 기록에서 열었으면 placeId로 어떤 기록이었는지 함께 보냅니다.
 * 신고는 맛객마다 한 번만 받고, 이유와 설명을 모두 받아 운영팀이 확인해 처리합니다.
 */
export default function TasterReportSheet({
  tasterId,
  tasterName,
  placeId,
  onClose,
}: {
  tasterId: string;
  tasterName: string;
  placeId?: string;
  onClose: () => void;
}) {
  const app = useAppData();
  const [reason, setReason] = useState<TasterReportReason | null>(null);
  const [memo, setMemo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  // 운영팀이 무엇이 문제인지 바로 확인할 수 있도록 이유와 설명을 모두 받습니다.
  const canSend = !!reason && memo.trim().length > 0 && !isSending;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!reason || !canSend) return;
    setIsSending(true);
    setError("");
    try {
      await app.actions.reportTaster(tasterId, reason, memo, placeId);
      app.actions.notify({
        kind: "success",
        title: "신고를 받았어요",
        message: "운영팀이 확인한 뒤 처리할게요. 알려 주셔서 고마워요.",
      });
      onClose();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) {
        app.actions.notify({ kind: "info", title: "이미 신고한 맛객이에요", message: "운영팀이 확인하고 있어요." });
        onClose();
        return;
      }
      setError(errorMessage(cause, "신고를 보내지 못했어요. 잠시 후 다시 시도해 주세요."));
      setIsSending(false);
    }
  }

  return (
    <Sheet title="맛객 신고하기" onClose={onClose} className="r-report-sheet">
      <form onSubmit={(event) => void submit(event)}>
        <p className="r-report-sheet__lead">
          <b>{tasterName}</b>님의 어떤 점이 문제인가요?
          <small>신고는 맛객마다 한 번만 할 수 있고, 운영팀이 확인해 처리해요.</small>
        </p>
        <div className="r-chips r-chips--wrap" role="radiogroup" aria-label="신고 이유">
          {REASONS.map((option) => (
            <button
              type="button"
              key={option.value}
              role="radio"
              aria-checked={reason === option.value}
              className={`r-chip ${reason === option.value ? "is-on" : ""}`}
              onClick={() => setReason(option.value)}
              disabled={isSending}
            >
              {option.label}
            </button>
          ))}
        </div>
        <label className="r-report-sheet__memo">
          <span>
            자세히 알려 주세요 <small>필수</small>
          </span>
          <textarea
            value={memo}
            maxLength={MEMO_MAX}
            rows={3}
            placeholder="예: 기록 사진마다 다른 가게 광고가 들어 있어요"
            onChange={(event) => setMemo(event.target.value)}
            disabled={isSending}
          />
          <small>
            {memo.length}/{MEMO_MAX}
          </small>
        </label>
        {error && (
          <p className="r-error-text" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="r-button r-button--primary r-button--block" disabled={!canSend}>
          {isSending ? "보내는 중…" : "신고 보내기"}
        </button>
      </form>
    </Sheet>
  );
}
