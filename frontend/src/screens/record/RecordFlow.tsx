import { useEffect, useState } from "react";
import { back } from "../../app/navigation";
import Icon from "../../components/Icon";
import { useNotificationDialog } from "../../components/NotificationDialog";
import Sheet from "../../components/Sheet";
import StepProgress from "../../components/StepProgress";
import type { Place } from "../../models/place";
import MediaStep from "./MediaStep";
import PlaceStep from "./PlaceStep";
import type { RecordDoneInfo } from "./RecordDone";
import { recordPlaceMeta, type RecordStep } from "./recordModel";
import ReviewStep from "./ReviewStep";
import StoryStep from "./StoryStep";
import TasteStep from "./TasteStep";
import { useRecordForm } from "./useRecordForm";

// 보드 11처럼 짧게 "다음", 마지막 쓰기 단계만 확인으로 넘어간다고 알립니다.
const NEXT_LABELS: Record<RecordStep, string> = {
  place: "다음",
  media: "다음",
  taste: "다음",
  story: "다음 · 확인",
  review: "",
};

/**
 * 장소 → 사진·메뉴 → 취향 태그·매장 이용 → 추천 이유·공개 범위 → 확인 순서로 한 단계씩 기록합니다(보드 11·12-01).
 * 내 기록 수정(보드 12-03)은 한 화면(ReviewStep의 수정 모양)에서 시작하고, 항목을 누르면 그 단계에서 고친 뒤 "완료"로 돌아옵니다.
 * 위쪽은 쓰는 단계에서 "기록 작성"과 번호 단계, 확인·수정 화면에서는 "최종 확인"·"내 기록 수정" 제목만 둡니다.
 */
export default function RecordFlow({
  editPlace,
  onSaved,
}: {
  editPlace?: Place;
  onSaved: (info: RecordDoneInfo) => void;
}) {
  const { confirm } = useNotificationDialog();
  const form = useRecordForm({ editPlace });
  const { steps } = form;
  const reviewIndex = steps.indexOf("review");
  const [index, setIndex] = useState(() => (form.isEditing ? reviewIndex : 0));
  const step = steps[Math.min(index, steps.length - 1)];
  const isFirst = index === 0;
  const isLast = step === "review";
  // 수정은 확인 화면이 첫 화면이고, 각 단계는 고치고 돌아오는 곳입니다.
  const isEditHome = form.isEditing && isLast;
  // 저장을 눌렀다가 실패해 같은 화면에 남았는지(재시도 버튼을 보여 줌)
  const [hasSaveFailed, setHasSaveFailed] = useState(false);

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
    setHasSaveFailed(false);
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
    moveTo(form.isEditing ? reviewIndex : index + 1);
  }

  function goBack() {
    if (isEditHome || (!form.isEditing && isFirst)) void close();
    else moveTo(form.isEditing ? reviewIndex : index - 1);
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
      meta: recordPlaceMeta(form.selectedPlace?.category_name, form.address),
      photo: form.photos[0],
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
      return;
    }
    setHasSaveFailed(true);
  }

  return (
    <main className="r-screen r-record">
      <header className="r-record-head">
        {isLast || form.isEditing ? (
          <div className="r-topbar r-topbar--center">
            <button
              type="button"
              className="r-icon-button"
              onClick={goBack}
              aria-label={isEditHome ? "수정 그만두기" : "이전 단계"}
            >
              <Icon name="back" />
            </button>
            <h1>{form.isEditing ? "내 기록 수정" : "최종 확인"}</h1>
            <span className="r-topbar__spacer" aria-hidden="true" />
          </div>
        ) : (
          <StepProgress
            className="r-record-head__progress"
            step={index + 1}
            total={steps.length}
            label="기록 진행"
            title="기록 작성"
            onBack={goBack}
            backLabel={isFirst ? "기록 그만두기" : "이전 단계"}
          />
        )}
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

        {/* 저장 실패(보드 18-02)는 입력을 그대로 둔 채 재시도할 수 있게 하고, 단계 검사 안내는 같은 상자에 글만 둡니다. */}
        {form.error && (
          <div className="r-error-box r-record-failure" role="alert">
            <Icon name="alert" />
            <span>
              <b>{form.error}</b>
              {hasSaveFailed && <small>입력 내용은 유지돼요. 다시 시도해 주세요.</small>}
            </span>
            {hasSaveFailed && (
              <button type="button" disabled={form.isSaving} onClick={() => void save()}>
                재시도
              </button>
            )}
          </div>
        )}

        {step === "place" && <PlaceStep form={form} />}
        {step === "media" && <MediaStep form={form} />}
        {step === "taste" && <TasteStep form={form} />}
        {step === "story" && <StoryStep form={form} />}
        {step === "review" && <ReviewStep form={form} onEdit={goToStep} />}
      </div>

      <div className="r-action-bar r-record-actions">
        {isLast ? (
          <button
            type="button"
            className="r-button r-button--primary r-button--block"
            disabled={form.isBusy || form.isSaving}
            onClick={() => void save()}
          >
            {form.isSaving ? "저장하고 있어요…" : form.isEditing ? "수정 저장" : "저장하기"}
          </button>
        ) : (
          <button
            type="button"
            className="r-button r-button--primary r-button--block"
            disabled={form.isBusy}
            onClick={next}
          >
            {form.isEditing ? "완료" : NEXT_LABELS[step]}
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
    </main>
  );
}
