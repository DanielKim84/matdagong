import { useEffect, useState } from "react";
import { ApiError } from "../../services/http";
import { getQuickPlaceDrafts, saveQuickPlaceDraft, type QuickPlaceDraft } from "../../services/places";
import { readLegacyQuickDraftPlaces, removeLegacyQuickDrafts } from "./recordHandoff";

/**
 * 이전 버전이 이 브라우저에만 저장한 빠른 기록을 계정 임시 목록으로 한 번 옮깁니다.
 * 아직 옮기지 못한 사용자의 데이터를 잃지 않도록 남겨 둔 이전용 코드입니다.
 */
async function migrateLegacyQuickDrafts(accessToken: string) {
  const places = readLegacyQuickDraftPlaces();
  if (!places) return;
  try {
    // 예전 데이터에는 저장할 때의 기기 위치가 없어, 서버가 위치를 확인할 수 없다고(400) 하면 옮기지 않고 정리합니다.
    await Promise.all(places.map((place) => saveQuickPlaceDraft(accessToken, place, null)));
    removeLegacyQuickDrafts();
  } catch (cause) {
    // 그 밖의 실패(네트워크 등)는 브라우저 임시 데이터를 보존해 다음 진입 때 다시 시도합니다.
    if (cause instanceof ApiError && cause.status === 400) removeLegacyQuickDrafts();
  }
}

/** 빠른 기록으로 임시 저장한 장소 목록입니다. isEnabled가 아니면(기록 수정) 불러오지 않습니다. */
export function useQuickDrafts({ accessToken, isEnabled }: { accessToken: string; isEnabled: boolean }) {
  const [drafts, setDrafts] = useState<QuickPlaceDraft[]>([]);

  useEffect(() => {
    if (!isEnabled) return;
    let active = true;
    (async () => {
      await migrateLegacyQuickDrafts(accessToken);
      const items = await getQuickPlaceDrafts(accessToken);
      if (active) setDrafts(items);
    })().catch(() => {
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
