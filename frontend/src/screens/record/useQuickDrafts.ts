import { useEffect, useState } from "react";
import { getQuickPlaceDrafts, type QuickPlaceDraft } from "../../services/places";

/** 빠른 기록으로 임시 저장한 장소 목록입니다. isEnabled가 아니면(기록 수정) 불러오지 않습니다. */
export function useQuickDrafts({ accessToken, isEnabled }: { accessToken: string; isEnabled: boolean }) {
  const [drafts, setDrafts] = useState<QuickPlaceDraft[]>([]);

  useEffect(() => {
    if (!isEnabled) return;
    let active = true;
    getQuickPlaceDrafts(accessToken)
      .then((items) => {
        if (active) setDrafts(items);
      })
      .catch(() => {
        if (active) setDrafts([]);
      });
    return () => {
      active = false;
    };
  }, [accessToken]);

  function removeDraft(providerPlaceId: string) {
    setDrafts((current) => current.filter((item) => item.providerPlaceId !== providerPlaceId));
  }

  return { drafts, removeDraft };
}
