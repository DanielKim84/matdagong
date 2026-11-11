import { useState } from "react";
import { RETRY_LATER_MESSAGE, useAppData } from "../../app/AppData";
import { useNotificationDialog } from "../../components/NotificationDialog";
import { MY_ACTIVITY_CHANGED_EVENT, changeRecordVisibility } from "../../services/places";
import { errorMessage } from "../../utils/errorMessage";

/**
 * 내 맛집 모음에서 고른 내 기록들의 공개 범위를 한 번에 바꿉니다.
 * 공개 범위는 다른 사람의 지도·피드 노출이 바로 바뀌므로, 무엇이 달라지는지 알리고 확인을 받은 뒤 바꿉니다.
 * changed는 저장 직후 내 기록을 다시 받기 전까지 먼저 반영해 둘 공개 범위입니다(true = 공개).
 */
export function useRecordVisibilityChange() {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const [isSaving, setIsSaving] = useState(false);
  const [changed, setChanged] = useState<Record<string, boolean>>({});

  /** 바꿨으면 true입니다. 확인창에서 취소했거나 실패하면 false입니다. */
  async function applyChange(placeIds: string[], shouldMakePublic: boolean): Promise<boolean> {
    if (!placeIds.length || isSaving) return false;
    const isConfirmed = await confirm({
      title: shouldMakePublic ? `${placeIds.length}곳을 공개할까요?` : `${placeIds.length}곳을 나만 보기로 바꿀까요?`,
      message: shouldMakePublic
        ? "남긴 사진·메뉴·태그 그대로 다른 사람의 지도와 피드에 보여요."
        : "남긴 사진·메뉴·태그는 그대로 두고, 다른 사람의 지도와 피드에서는 빠져요.",
      confirmLabel: shouldMakePublic ? "공개할게요" : "나만 볼게요",
      tone: "info",
    });
    if (!isConfirmed) return false;
    setIsSaving(true);
    try {
      const result = await changeRecordVisibility(app.accessToken, placeIds, shouldMakePublic ? "PUBLIC" : "PRIVATE");
      setChanged((current) => ({ ...current, ...Object.fromEntries(placeIds.map((id) => [id, shouldMakePublic])) }));
      window.dispatchEvent(new Event(MY_ACTIVITY_CHANGED_EVENT));
      app.actions.notify({
        kind: "success",
        title: shouldMakePublic ? `${result.changed}곳을 공개했어요` : `${result.changed}곳을 나만 보기로 바꿨어요`,
        message: shouldMakePublic
          ? "이제 다른 사람의 지도와 피드에도 보여요. 내가 등록한 곳에서 볼 수 있어요."
          : "이제 나에게만 보여요. 나만 보기에서 볼 수 있어요.",
      });
      return true;
    } catch (cause) {
      app.actions.notify({
        kind: "error",
        title: "공개 범위를 바꾸지 못했어요",
        message: errorMessage(cause, RETRY_LATER_MESSAGE),
      });
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  return { changed, isSaving, applyChange };
}
