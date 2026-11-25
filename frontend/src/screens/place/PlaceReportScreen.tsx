import { useState } from "react";
import { useAppData } from "../../app/AppData";
import SubScreen from "../../components/SubScreen";
import { reportPlace, type PlaceReportReason } from "../../services/places";
import type { Place } from "../../models/place";
import { errorMessage } from "../../utils/errorMessage";

/**
 * 제보 설명 최대 글자 수(보드 10-04 "0/300"). 장소 서비스 PlaceReportModels.PlaceReportRequest와
 * DB place_reports.memo(VARCHAR(500))는 500자까지 받으므로 화면이 더 짧게 받는 것은 괜찮습니다.
 */
const MEMO_MAX = 300;

// 보드 10-04처럼 굵은 이름과 한 줄 설명을 둔 고르기 줄입니다. 보드에 없는 "전화"는 화면에서 고르지 않습니다.
const REASONS: { value: PlaceReportReason; label: string; description: string }[] = [
  { value: "CLOSED", label: "폐업", description: "더 이상 운영하지 않아요." },
  { value: "WRONG_NAME", label: "이름", description: "가게 이름이 달라요." },
  { value: "WRONG_ADDRESS", label: "주소", description: "주소 정보가 올바르지 않아요." },
  { value: "WRONG_LOCATION", label: "위치", description: "지도상 위치가 맞지 않아요." },
  { value: "OTHER", label: "기타", description: "위 항목에 해당하지 않는 제보예요." },
];

/**
 * 맛집 상세 "정보 제보"(보드 10-04, 전체 화면): 큰 제목 "가게 정보 제보"와 설명, 제보 이유 고르기 줄, 필수 설명 칸(0/300), 아래 "제보하기".
 * 맛객이 남긴 기록 내용이 아니라 모두가 함께 보는 가게 정보에 대한 제보이고, 관리자가 확인해 고칩니다.
 */
export default function PlaceReportScreen({ place, onClose }: { place: Place; onClose: () => void }) {
  const app = useAppData();
  const [reason, setReason] = useState<PlaceReportReason | null>(null);
  const [memo, setMemo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const canSend = !!reason && memo.trim().length > 0 && !isSending;

  async function submit() {
    if (!reason || !canSend) return;
    setIsSending(true);
    setError("");
    try {
      const result = await reportPlace(app.accessToken, place.id, reason, memo);
      app.actions.notify({
        kind: "success",
        title: result.duplicate ? "이미 받은 제보예요" : "제보해 주셔서 고마워요",
        message: result.duplicate
          ? "같은 내용을 확인하고 있어요. 확인되면 가게 정보를 고칠게요."
          : "확인한 뒤 가게 정보를 고칠게요.",
      });
      onClose();
    } catch (cause) {
      setError(errorMessage(cause, "제보를 보내지 못했어요. 잠시 후 다시 시도해 주세요."));
      setIsSending(false);
    }
  }

  return (
    <SubScreen
      title="가게 정보 제보"
      onClose={onClose}
      className="r-report-screen"
      intro={
        <>
          가게의 기본 정보가 잘못되었나요?
          <br />
          확인 후 반영할게요.
        </>
      }
      footer={
        <button type="button" className="r-button r-button--primary" disabled={!canSend} onClick={() => void submit()}>
          {isSending ? "보내는 중…" : "제보하기"}
        </button>
      }
    >
      <div className="r-options" role="radiogroup" aria-label="제보 이유">
        {REASONS.map((option) => (
          <button
            type="button"
            key={option.value}
            role="radio"
            aria-checked={reason === option.value}
            className={`r-option ${reason === option.value ? "is-on" : ""}`}
            onClick={() => setReason(option.value)}
            disabled={isSending}
          >
            <span className="r-option__radio" aria-hidden="true" />
            <b>{option.label}</b>
            <small>{option.description}</small>
          </button>
        ))}
      </div>
      <label className="r-report-sheet__memo">
        <span className="visually-hidden">잘못된 내용 (필수)</span>
        <textarea
          value={memo}
          maxLength={MEMO_MAX}
          rows={5}
          placeholder="잘못된 내용을 자세히 알려주세요. (필수)"
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
    </SubScreen>
  );
}
