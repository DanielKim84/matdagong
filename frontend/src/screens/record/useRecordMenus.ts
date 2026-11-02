import { useState } from "react";
import { useNotificationDialog } from "../../components/NotificationDialog";
import type { Taster } from "../../models/place";
import { loadPhoto } from "../../services/photos";
import { refreshMediaUrl, type RegisterDraftForm } from "../../services/registerDraft";
import { errorMessage } from "../../utils/errorMessage";
import { MAX_MENUS, emptyMenu, menuRowsFromRecord, type MenuRow } from "./recordModel";

/** 추천 메뉴 줄(이름·가격·사진) 추가·수정·삭제입니다. 줄이 하나도 없으면 빈 줄 하나를 둡니다. */
export function useRecordMenus({
  draft,
  editRecord,
  setError,
}: {
  draft?: RegisterDraftForm;
  editRecord?: Taster;
  setError: (message: string) => void;
}) {
  const { confirm } = useNotificationDialog();
  const [menus, setMenus] = useState<MenuRow[]>(() => {
    if (!draft) return menuRowsFromRecord(editRecord);
    // 복원한 메뉴 사진도 새로 받은 기록의 서명 주소로 바꿉니다.
    const currentMenuPhotos = (editRecord?.menus ?? []).flatMap((menu) =>
      typeof menu !== "string" && menu.photo ? [menu.photo] : [],
    );
    return draft.menus.map((menu) =>
      menu.photo ? { ...menu, photo: refreshMediaUrl(menu.photo, currentMenuPhotos) } : menu,
    );
  });

  function addMenu() {
    if (menus.length >= MAX_MENUS) {
      setError(`대표 메뉴는 ${MAX_MENUS}개까지 추가할 수 있어요.`);
      return;
    }
    setMenus((current) => [...current, emptyMenu()]);
  }

  function updateMenu(index: number, patch: Partial<MenuRow>) {
    setMenus((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  async function setMenuPhoto(index: number, file: File) {
    try {
      const photo = await loadPhoto(file);
      updateMenu(index, { photo });
    } catch (cause) {
      setError(errorMessage(cause, "메뉴 사진을 불러오지 못했어요."));
    }
  }

  async function removeMenu(index: number) {
    const item = menus[index];
    if (!item) return;
    const hasContent = !!(item.name.trim() || item.price || item.photo);
    if (
      hasContent &&
      !(await confirm({
        title: "메뉴를 삭제할까요?",
        message: `‘${item.name.trim() || `메뉴 ${index + 1}`}’ 항목을 목록에서 삭제합니다.`,
        confirmLabel: "삭제할게요",
        tone: "danger",
      }))
    )
      return;
    setMenus((current) => (current.length > 1 ? current.filter((_, rowIndex) => rowIndex !== index) : [emptyMenu()]));
  }

  return { menus, addMenu, updateMenu, setMenuPhoto, removeMenu };
}
