import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { isMyTaster, type Place } from "../../models/place";
import { isSessionExpiredError } from "../../services/http";
import { clearRegisterDraft, type RegisterDraftForm } from "../../services/registerDraft";
import { accountIdFromAccessToken } from "../../utils/accessToken";
import { errorMessage } from "../../utils/errorMessage";
import { EDIT_RECORD_STEPS, NEW_RECORD_STEPS, VALIDATED_STEPS, type RecordStep } from "./recordModel";
import { buildNewPlace } from "./recordPayload";
import { recordStepError } from "./recordValidation";
import { useDraftBackup } from "./useDraftBackup";
import { useRecordMenus } from "./useRecordMenus";
import { useRecordPhotos } from "./useRecordPhotos";
import { useRecordPlace } from "./useRecordPlace";
import { useRecordStory } from "./useRecordStory";
import { useRecordTaste } from "./useRecordTaste";
import { useRestoredDraft } from "./useRestoredDraft";

export type RecordSubmitResult = { isSaved: true; placeId: string } | { isSaved: false; step?: RecordStep };

/**
 * 기록하기(새 기록·수정)의 입력 상태를 모읍니다. 장소·사진·메뉴·취향·추천 이유는 각 훅이 맡고,
 * 이 훅은 로그인 만료 대비 보관, 단계 검사, 저장을 맡습니다. 화면은 단계별 컴포넌트로 나눠 이 훅을 씁니다.
 */
export function useRecordForm({ editPlace, editPlaceId }: { editPlace?: Place; editPlaceId?: string }) {
  const app = useAppData();
  const editRecord = editPlace?.tasters.find(isMyTaster);
  const isEditing = !!editPlace && !!editRecord;
  const draftEditPlaceId = isEditing && editPlace ? editPlace.id : null;
  // 수정할 기록을 아직 불러오는 중이면 보관한 입력을 복원하거나 저장하지 않습니다.
  const isEditLoading = !!editPlaceId && !isEditing;
  const accountId = accountIdFromAccessToken(app.accessToken);
  const { restoredDraft, draftNotice, dismissDraftNotice } = useRestoredDraft({
    accountId,
    editPlaceId: draftEditPlaceId,
    isEditLoading,
  });
  const draft = restoredDraft?.form;

  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { hasPlaceStep, resetAfterSave, ...placeForm } = useRecordPlace({ draft, editPlace, isEditing, setError });
  const photoForm = useRecordPhotos({ draft, editRecord, setError });
  const menuForm = useRecordMenus({ draft, editRecord, setError });
  const tasteForm = useRecordTaste({ draft, editPlace, editRecord });
  const storyForm = useRecordStory({ draft, editRecord });
  const steps = hasPlaceStep ? NEW_RECORD_STEPS : EDIT_RECORD_STEPS;

  const draftForm: RegisterDraftForm = {
    editPlaceId: draftEditPlaceId,
    selectedPlace: placeForm.selectedPlace,
    name: placeForm.name,
    address: placeForm.address,
    coordinates: placeForm.coordinates,
    reason: storyForm.reason,
    menus: menuForm.menus,
    tags: tasteForm.tags,
    visitConditions: tasteForm.visitConditions,
    foodKind: tasteForm.foodKind,
    visibility: storyForm.visibility,
    photos: photoForm.photos,
    convertFromPlaceId: placeForm.convertFromPlaceId,
    visitedConfirmed: placeForm.isVisitConfirmed,
    conversionNeedsPlaceSearch: placeForm.shouldSearchConversionPlace,
    conversionSearchName: placeForm.conversionSearchName,
    activeDraftId: placeForm.activeDraftId,
  };
  const { isDirty, persistDraft } = useDraftBackup(draftForm, {
    accountId,
    hasRestoredDraft: !!restoredDraft,
    isEditLoading,
  });

  /** 단계별 필수값을 검사해 문제가 있으면 안내 문구를 돌려줍니다. */
  function validateStep(step: RecordStep): string {
    return recordStepError(step, {
      isEditing,
      places: app.places,
      selectedPlace: placeForm.selectedPlace,
      address: placeForm.address,
      coordinates: placeForm.coordinates,
      shouldSearchConversionPlace: placeForm.shouldSearchConversionPlace,
      conversionSearchName: placeForm.conversionSearchName,
      convertFromPlaceId: placeForm.convertFromPlaceId,
      hasSelectedLikedPlace: !!placeForm.selectedLikedPlace,
      isVisitConfirmed: placeForm.isVisitConfirmed,
      isBusy: photoForm.isBusy,
      photoCount: photoForm.photos.length,
      reason: storyForm.reason,
    });
  }

  /** 모든 단계를 다시 검사하고 저장합니다. 실패하면 문제가 있는 단계를 돌려줍니다. */
  async function submit(): Promise<RecordSubmitResult> {
    const invalidStep = VALIDATED_STEPS.find((step) => validateStep(step));
    if (invalidStep) {
      setError(validateStep(invalidStep));
      return { isSaved: false, step: invalidStep };
    }
    const { selectedPlace, coordinates, convertFromPlaceId, selectedLikedPlace } = placeForm;
    if (!selectedPlace || !coordinates) return { isSaved: false, step: "place" };
    const newPlace = buildNewPlace({
      selectedPlace,
      coordinates,
      name: placeForm.name,
      address: placeForm.address,
      reason: storyForm.reason,
      menus: menuForm.menus,
      tags: tasteForm.tags,
      tasteTags: app.tasteTags,
      visitConditions: tasteForm.visitConditions,
      foodKind: tasteForm.foodKind,
      photos: photoForm.photos,
      visibility: storyForm.visibility,
    });
    setIsSaving(true);
    setError("");
    try {
      const saved = await app.actions.register(
        newPlace,
        convertFromPlaceId ?? selectedLikedPlace?.id,
        convertFromPlaceId || selectedLikedPlace ? placeForm.isVisitConfirmed : false,
        true,
      );
      clearRegisterDraft();
      resetAfterSave();
      return { isSaved: true, placeId: saved.id };
    } catch (cause) {
      if (isSessionExpiredError(cause)) {
        // 저장 버튼을 누른 시점의 입력을 보관하고, 재로그인 뒤 이 화면에서 복원합니다.
        persistDraft(true);
        setError("로그인 시간이 지나 다시 로그인하고 있어요. 입력한 내용은 로그인 뒤 이 화면에서 복원돼요.");
        return { isSaved: false };
      }
      setError(errorMessage(cause, "맛집 기록을 저장하지 못했어요."));
      return { isSaved: false };
    } finally {
      setIsSaving(false);
    }
  }

  return {
    isEditing,
    steps,
    isDirty,
    draftNotice,
    dismissDraftNotice,
    error,
    setError,
    isSaving,
    ...placeForm,
    ...photoForm,
    ...menuForm,
    ...tasteForm,
    ...storyForm,
    validateStep,
    submit,
  };
}

export type RecordForm = ReturnType<typeof useRecordForm>;
