import { useEffect, useState } from "react";
import { clearRegisterDraft, readRegisterDraft } from "../../services/registerDraft";
import { hasPlaceHandoff } from "./recordHandoff";

const RESTORED_NOTICE = "로그인이 만료되기 전 입력한 내용을 복원했어요.";
const RESTORED_WITHOUT_PHOTOS_NOTICE =
  "로그인이 만료되기 전 입력한 내용을 복원했어요. 저장 공간이 부족해 새로 추가한 사진은 복원하지 못했어요. 사진을 다시 추가해 주세요.";

/**
 * 로그인 만료로 보관해 둔 입력은 같은 계정·같은 등록 대상일 때 한 번만 복원합니다.
 * 수정할 기록을 아직 불러오는 중이거나 다른 화면이 새 장소를 넘겼으면 복원하지 않습니다.
 */
export function useRestoredDraft({
  accountId,
  editPlaceId,
  isEditLoading,
}: {
  accountId: string | null;
  editPlaceId: string | null;
  isEditLoading: boolean;
}) {
  const [restoredDraft] = useState(() =>
    isEditLoading || hasPlaceHandoff() ? null : readRegisterDraft(accountId, editPlaceId),
  );
  const [draftNotice, setDraftNotice] = useState<string | null>(() =>
    !restoredDraft ? null : restoredDraft.photosOmitted ? RESTORED_WITHOUT_PHOTOS_NOTICE : RESTORED_NOTICE,
  );

  useEffect(() => {
    // 복원한 입력은 한 번만 쓰고 지웁니다. 다시 만료되면 그때의 입력을 새로 보관합니다.
    if (restoredDraft) clearRegisterDraft();
  }, [restoredDraft]);

  return { restoredDraft, draftNotice, dismissDraftNotice: () => setDraftNotice(null) };
}
