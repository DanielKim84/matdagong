import { useEffect, useState } from "react";
import { useAppData } from "../../app/AppData";
import { useNotificationDialog } from "../../components/NotificationDialog";
import {
  MY_ACTIVITY_CHANGED_EVENT,
  deleteQuickPlaceDraft,
  getQuickPlaceDrafts,
  type QuickPlaceDraft,
} from "../../services/places";
import { errorMessage } from "../../utils/errorMessage";

/** 장소만 먼저 저장한 빠른 기록 목록. 내 활동이 바뀌면(MY_ACTIVITY_CHANGED_EVENT) 조용히 다시 불러옵니다. */
export function useQuickPlaceDrafts() {
  const app = useAppData();
  const { confirm } = useNotificationDialog();
  const [drafts, setDrafts] = useState<QuickPlaceDraft[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState("");

  useEffect(() => {
    let active = true;
    async function load(shouldShowLoading: boolean) {
      if (shouldShowLoading) setIsLoading(true);
      try {
        const items = await getQuickPlaceDrafts(app.accessToken);
        if (!active) return;
        setDrafts(items);
        setIsLoaded(true);
        setError("");
      } catch (cause) {
        // 실패하면 0곳으로 오해하지 않도록 개수를 미확인 상태로 둡니다.
        if (active) setError(errorMessage(cause, "빠른 장소 기록을 불러오지 못했어요."));
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void load(true);
    const refresh = () => void load(false);
    window.addEventListener(MY_ACTIVITY_CHANGED_EVENT, refresh);
    return () => {
      active = false;
      window.removeEventListener(MY_ACTIVITY_CHANGED_EVENT, refresh);
    };
  }, [app.accessToken]);

  async function remove(draft: QuickPlaceDraft) {
    const isConfirmed = await confirm({
      title: "빠른 장소 기록을 삭제할까요?",
      message: `‘${draft.placeName}’ 기록은 삭제하면 복구할 수 없어요.`,
      confirmLabel: "삭제할게요",
      tone: "danger",
    });
    if (!isConfirmed) return;
    setDeletingId(draft.providerPlaceId);
    setError("");
    try {
      await deleteQuickPlaceDraft(app.accessToken, draft.providerPlaceId, draft.providerCode);
      setDrafts((current) =>
        current.filter(
          (item) => item.providerCode !== draft.providerCode || item.providerPlaceId !== draft.providerPlaceId,
        ),
      );
    } catch (cause) {
      setError(errorMessage(cause, "장소 기록을 삭제하지 못했어요."));
    } finally {
      setDeletingId("");
    }
  }

  return { drafts, isLoaded, isLoading, error, deletingId, remove };
}
