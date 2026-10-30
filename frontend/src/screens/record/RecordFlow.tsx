import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { back } from "../../app/navigation";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import Sheet from "../../components/Sheet";
import type { Place } from "../../models/place";
import TasteTagRequestSheet from "../TasteTagRequestSheet";
import type { RecordDoneInfo } from "./RecordDone";
import { MediaStep, PlaceStep, ReviewStep, StoryStep, TasteStep } from "./RecordSteps";
import { useRecordForm, type RecordStep } from "./useRecordForm";

const nextLabels: Record<RecordStep, string> = {
  place: "다음 · 사진과 메뉴",
  media: "다음 · 취향 태그",
  taste: "다음 · 추천 이유",
  story: "다음 · 확인",
  review: "",
};

/** 장소 → 사진·메뉴 → 취향 태그·방문 조건 → 추천 이유·공개 범위 → 확인 순서로 한 단계씩 기록합니다. */
export default function RecordFlow({ editPlace, editPlaceId, onSaved }: {
  editPlace?: Place;
  editPlaceId?: string;
  onSaved: (info: RecordDoneInfo) => void;
}) {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const form = useRecordForm({ editPlace, editPlaceId });
  const { steps } = form;
  const [index, setIndex] = useState(0);
  const [requestType, setRequestType] = useState<"TAG" | "PLACE_INFO" | null>(null);
  const step = steps[Math.min(index, steps.length - 1)];
  const isFirst = index === 0;
  const isLast = step === "review";

  function moveTo(nextIndex: number, keepError = false) {
    setIndex(Math.max(0, Math.min(nextIndex, steps.length - 1)));
    if (!keepError) form.setError("");
    window.scrollTo(0, 0);
  }

  function goToStep(target: RecordStep) {
    const targetIndex = steps.indexOf(target);
    if (targetIndex >= 0) moveTo(targetIndex);
  }

  function next() {
    const message = form.validateStep(step);
    if (message) {
      form.setError(message);
      return;
    }
    moveTo(index + 1);
  }

  async function close() {
    if (form.dirty && !await confirm({
      title: form.editing ? "수정을 그만둘까요?" : "기록을 그만둘까요?",
      message: "지금까지 입력한 내용은 저장되지 않아요.",
      confirmLabel: "그만둘게요",
      tone: "danger",
    })) return;
    back(form.editing ? "my" : "home");
  }

  async function save() {
    const info = {
      name: form.name,
      headline: form.headline.trim() || form.reason.split("\n")[0] || "",
      photo: form.photos[0],
      tags: form.tags.slice(0, 3),
      visibility: form.visibility,
    };
    const result = await form.submit();
    if (result.ok) {
      if (!form.editing) onSaved({ ...info, placeId: result.placeId });
      return;
    }
    if (result.step) {
      const target = steps.indexOf(result.step);
      if (target >= 0) moveTo(target, true);
    }
  }

  const progress = ((index + 1) / steps.length) * 100;

  return (
    <div className="r-screen r-record">
      <header className="r-record-head">
        <button type="button" className="r-icon-button" aria-label={isFirst ? "기록 닫기" : "이전 단계"}
          onClick={() => isFirst ? void close() : moveTo(index - 1)}>
          <Icon name={isFirst ? "close" : "back"} />
        </button>
        <div className="r-record-progress" role="progressbar" aria-label="기록 진행"
          aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={index + 1}>
          <div style={{ width: `${progress}%` }} />
        </div>
        <span className="r-record-progress__count">{index + 1}/{steps.length}</span>
      </header>

      <div className="r-record-body">
        {form.draftNotice && (
          <div className="r-record-notice" role="status">
            <Icon name="check" />
            <span>{form.draftNotice}</span>
            <button type="button" onClick={form.dismissDraftNotice}>확인</button>
          </div>
        )}

        {step !== "place" && form.name && (
          <div className="r-record-place-chip">
            {form.photos[0]
              ? <img src={form.photos[0]} alt="" />
              : <span className="r-record-place-chip__pin" aria-hidden="true"><Icon name="pin" /></span>}
            <b>{form.name}</b>
            {form.editing && <span className="r-tag r-tag--neutral">수정 중</span>}
          </div>
        )}

        {step === "place" && <PlaceStep form={form} />}
        {step === "media" && <MediaStep form={form} />}
        {step === "taste" && <TasteStep form={form} onRequest={setRequestType} />}
        {step === "story" && <StoryStep form={form} />}
        {step === "review" && <ReviewStep form={form} onEdit={goToStep} />}

        {form.error && <p className="r-record-error" role="alert">{form.error}</p>}
      </div>

      <div className="r-action-bar r-record-actions">
        {isLast ? (
          <button type="button" className="r-button r-button--primary r-button--block" disabled={form.busy || form.saving} onClick={() => void save()}>
            {form.saving ? "저장하고 있어요…" : form.editing ? "수정 내용 저장하기" : "기록 남기기"}
          </button>
        ) : (
          <button type="button" className="r-button r-button--primary r-button--block" disabled={form.busy} onClick={next}>
            {nextLabels[step]}
          </button>
        )}
      </div>

      {form.visitPromptOpen && form.selectedPlace && (
        <Sheet title="내 맛집에 저장한 장소예요" onClose={form.cancelLikedPlaceRegistration} className="r-record-sheet">
          <p className="r-record-sheet__lead">
            ‘{form.selectedPlace.place_name}’은 하트로 저장했지만 아직 직접 방문한 기록은 없어요.
            실제로 방문한 경우에만 맛집 기록을 남길 수 있어요. 방문하셨나요?
          </p>
          <div className="r-record-sheet__actions">
            <button type="button" className="r-button r-button--secondary" onClick={form.cancelLikedPlaceRegistration}>다른 장소 고르기</button>
            <button type="button" className="r-button r-button--primary" onClick={form.confirmVisit}>직접 방문했어요</button>
          </div>
        </Sheet>
      )}
      {requestType && (
        <TasteTagRequestSheet requestType={requestType} onClose={() => setRequestType(null)}
          onRequest={app.actions.requestTag} onLoad={app.actions.loadTagRequests} />
      )}
    </div>
  );
}
