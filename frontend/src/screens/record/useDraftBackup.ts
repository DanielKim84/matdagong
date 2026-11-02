import { useEffect, useRef, useState } from "react";
import { onSessionExpiring } from "../../services/http";
import { saveRegisterDraft, type RegisterDraftForm } from "../../services/registerDraft";

/**
 * 작성 중인 입력이 있으면 로그인이 만료될 때 탭 저장소에 보관해 재로그인 뒤 복원할 수 있게 합니다.
 * 처음 연 상태와 달라졌는지(isDirty)도 함께 알려 줍니다.
 */
export function useDraftBackup(
  form: RegisterDraftForm,
  {
    accountId,
    hasRestoredDraft,
    isEditLoading,
  }: { accountId: string | null; hasRestoredDraft: boolean; isEditLoading: boolean },
) {
  const [initialSnapshot] = useState(() => JSON.stringify(form));
  const isDirty = JSON.stringify(form) !== initialSnapshot;
  // 로그인 만료 알림은 렌더 밖에서 오므로 최신 입력을 ref로 넘깁니다.
  const latestForm = useRef(form);
  useEffect(() => {
    latestForm.current = form;
  });

  function persistDraft(shouldForce = false) {
    if (isEditLoading) return;
    const current = latestForm.current;
    // 처음 연 상태 그대로라면 보관할 입력이 없습니다. 복원한 입력은 수정하지 않았어도 다시 보관합니다.
    if (!shouldForce && !hasRestoredDraft && JSON.stringify(current) === initialSnapshot) return;
    saveRegisterDraft(current, accountId);
  }

  // persistDraft는 ref로 최신 입력을 읽으므로 처음 한 번만 구독해도 됩니다.
  useEffect(() => onSessionExpiring(() => persistDraft()), []);

  return { isDirty, persistDraft };
}
