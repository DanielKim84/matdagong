import { useEffect, useState } from "react";
import { useAppData } from "../../app/AppData";
import { back } from "../../app/navigation";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import Sheet from "../../components/Sheet";
import StepProgress from "../../components/StepProgress";
import type { Place } from "../../models/place";
import { groupsForFocus } from "../../models/tasteTags";
import TasteTagRequestSheet from "../TasteTagRequestSheet";
import MediaStep from "./MediaStep";
import PlaceStep from "./PlaceStep";
import type { RecordDoneInfo } from "./RecordDone";
import { summaryHeadline, type RecordStep } from "./recordModel";
import ReviewStep from "./ReviewStep";
import StoryStep from "./StoryStep";
import TasteStep from "./TasteStep";
import { useRecordForm } from "./useRecordForm";

/** 저장 완료 화면의 기록 요약에 보여 줄 태그 수 */
const DONE_TAG_LIMIT = 3;

const NEXT_LABELS: Record<RecordStep, string> = {
  place: "다음 · 사진과 메뉴",
  media: "다음 · 취향 태그",
  taste: "다음 · 추천 이유",
  story: "다음 · 확인",
  review: "",
};

/** 장소 → 사진·메뉴 → 취향 태그·매장 이용 → 추천 이유·공개 범위 → 확인 순서로 한 단계씩 기록합니다. */
export default function RecordFlow({
  editPlace,
  onSaved,
}: {
  editPlace?: Place;
  onSaved: (info: RecordDoneInfo) => void;
}) {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const form = useRecordForm({ editPlace });
  const { steps } = form;
  const [index, setIndex] = useState(0);
  const [requestType, setRequestType] = useState<"TAG" | "PLACE_INFO" | null>(null);
  const step = steps[Math.min(index, steps.length - 1)];
  const isFirst = index === 0;
  const isLast = step === "review";

  // 맛집 상세·빠른 기록이 가게를 정해 넘겼으면 사진·메뉴 단계부터 시작합니다.
  useEffect(() => {
    if (form.shouldSkipPlaceStep && steps[0] === "place") setIndex(1);
  }, [form.shouldSkipPlaceStep, steps]);
  // 방문 확인에서 '다른 장소 고르기'로 가게를 비우면 장소 단계로 돌아갑니다.
  const hasSelectedPlace = !!form.selectedPlace;
  useEffect(() => {
    if (!hasSelectedPlace && steps[0] === "place") setIndex(0);
  }, [hasSelectedPlace, steps]);

  function moveTo(nextIndex: number, shouldKeepError = false) {
    setIndex(Math.max(0, Math.min(nextIndex, steps.length - 1)));
    if (!shouldKeepError) form.setError("");
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
    if (
      form.isDirty &&
      !(await confirm({
        title: form.isEditing ? "수정을 그만둘까요?" : "기록을 그만둘까요?",
        message: "지금까지 입력한 내용은 저장되지 않아요.",
        confirmLabel: "그만둘게요",
        tone: "danger",
      }))
    )
      return;
    back(form.isEditing ? "my" : "home");
  }

  async function save() {
    const info = {
      name: form.name,
      headline: summaryHeadline(form.headline, form.reason),
      photo: form.photos[0],
      tags: form.tags.slice(0, DONE_TAG_LIMIT),
      visibility: form.visibility,
    };
    const result = await form.submit();
    if (result.isSaved) {
      if (!form.isEditing) onSaved({ ...info, placeId: result.placeId });
      return;
    }
    if (result.step) {
      const target = steps.indexOf(result.step);
      if (target >= 0) moveTo(target, true);
    }
  }

  return (
    <main className="r-screen r-record">
      <header className="r-record-head">
        <StepProgress
          className="r-record-head__progress"
          step={index + 1}
          total={steps.length}
          label="기록 진행"
          onBack={() => (isFirst ? void close() : moveTo(index - 1))}
          backIcon={isFirst ? "close" : "back"}
          backLabel={isFirst ? "기록 닫기" : "이전 단계"}
        />
      </header>

      <div className="r-record-body">
        {form.draftNotice && (
          <div className="r-record-notice" role="status">
            <Icon name="check" />
            <span>{form.draftNotice}</span>
            <button type="button" onClick={form.dismissDraftNotice}>
              확인
            </button>
          </div>
        )}

        {step !== "place" && form.name && (
          <div className="r-record-place-chip">
            {form.photos[0] ? (
              <img src={form.photos[0]} alt="" />
            ) : (
              <span className="r-record-place-chip__pin" aria-hidden="true">
                <Icon name="pin" />
              </span>
            )}
            <b>{form.name}</b>
            {form.isEditing && <span className="r-tag">수정 중</span>}
          </div>
        )}

        {step === "place" && <PlaceStep form={form} />}
        {step === "media" && <MediaStep form={form} />}
        {step === "taste" && <TasteStep form={form} onRequest={setRequestType} />}
        {step === "story" && <StoryStep form={form} />}
        {step === "review" && <ReviewStep form={form} onEdit={goToStep} />}

        {form.error && (
          <p className="r-record-error" role="alert">
            {form.error}
          </p>
        )}
      </div>

      <div className="r-action-bar r-record-actions">
        {isLast ? (
          <button
            type="button"
            className="r-button r-button--primary r-button--block"
            disabled={form.isBusy || form.isSaving}
            onClick={() => void save()}
          >
            {form.isSaving ? "저장하고 있어요…" : form.isEditing ? "수정 내용 저장하기" : "기록 남기기"}
          </button>
        ) : (
          <button
            type="button"
            className="r-button r-button--primary r-button--block"
            disabled={form.isBusy}
            onClick={next}
          >
            {NEXT_LABELS[step]}
          </button>
        )}
      </div>

      {form.isVisitPromptOpen && form.selectedPlace && (
        <Sheet title="내 맛집에 저장한 장소예요" onClose={form.cancelLikedPlaceRegistration} className="r-record-sheet">
          <p className="r-record-sheet__lead">
            ‘{form.selectedPlace.place_name}’은 하트로 저장했지만 아직 직접 방문한 기록은 없어요. 실제로 방문한 경우에만
            맛집 기록을 남길 수 있어요. 방문하셨나요?
          </p>
          <div className="r-record-sheet__actions">
            <button type="button" className="r-button r-button--secondary" onClick={form.cancelLikedPlaceRegistration}>
              다른 장소 고르기
            </button>
            <button type="button" className="r-button r-button--primary" onClick={form.confirmVisit}>
              직접 방문했어요
            </button>
          </div>
        </Sheet>
      )}
      {requestType && (
        <TasteTagRequestSheet
          requestType={requestType}
          groups={groupsForFocus(form.foodKind)}
          onClose={() => setRequestType(null)}
          onRequest={app.actions.requestTag}
          onLoad={app.actions.loadTagRequests}
        />
      )}
    </main>
  );
}
