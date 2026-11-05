import { useState, type FormEvent } from "react";
import { useAppData } from "../../app/AppData";
import Sheet from "../../components/Sheet";
import { reportPlace, type PlaceReportReason } from "../../services/places";
import type { Place } from "../../models/place";
import { errorMessage } from "../../utils/errorMessage";

const MEMO_MAX = 500;

const REASONS: { value: PlaceReportReason; label: string }[] = [
  { value: "CLOSED", label: "폐업했어요" },
  { value: "WRONG_NAME", label: "가게 이름이 달라요" },
  { value: "WRONG_ADDRESS", label: "주소가 달라요" },
  { value: "WRONG_PHONE", label: "전화번호가 달라요" },
  { value: "WRONG_LOCATION", label: "지도 위치가 달라요" },
  { value: "OTHER", label: "기타" },
];

/**
 * 맛집 상세 "잘못된 정보 알려주기": 가게 기본 정보(이름·주소·전화·위치)가 틀렸거나 폐업한 곳을 알립니다.
 * 맛객이 남긴 기록 내용이 아니라 모두가 함께 보는 가게 정보에 대한 제보이고, 관리자가 확인해 고칩니다.
 */
export default function PlaceReportSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const app = useAppData();
  const [reason, setReason] = useState<PlaceReportReason | null>(null);
  const [memo, setMemo] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const isMemoRequired = reason === "OTHER";
  const canSend = !!reason && (!isMemoRequired || memo.trim().length > 0) && !isSending;

  async function submit(event: FormEvent) {
    event.preventDefault();
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
      setError(errorMessage(cause, "제보를 보내지 못했어요. 잠시 뒤 다시 시도해 주세요."));
      setIsSending(false);
    }
  }

  return (
    <Sheet title="잘못된 정보 알려주기" onClose={onClose} className="r-report-sheet">
      <form onSubmit={(event) => void submit(event)}>
        <p className="r-report-sheet__lead">
          <b>{place.name}</b>의 어떤 정보가 다른가요?
        </p>
        <div className="r-chips r-chips--wrap" role="radiogroup" aria-label="제보 이유">
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
          <span>자세히 알려 주세요 {isMemoRequired ? <small>필수</small> : <small>선택</small>}</span>
          <textarea
            value={memo}
            maxLength={MEMO_MAX}
            rows={3}
            placeholder="예: 10월부터 문을 닫았어요 / 바뀐 전화번호는 02-123-4567이에요"
            onChange={(event) => setMemo(event.target.value)}
            disabled={isSending}
          />
          <small>
            {memo.length}/{MEMO_MAX}
          </small>
        </label>
        {error && (
          <p className="r-report-sheet__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="r-button r-button--primary r-button--block" disabled={!canSend}>
          {isSending ? "보내는 중…" : "제보 보내기"}
        </button>
      </form>
    </Sheet>
  );
}
