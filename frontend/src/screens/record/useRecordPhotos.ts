import { useState, type ChangeEvent } from "react";
import { useNotificationDialog } from "../../components/NotificationDialog";
import { loadPhoto } from "../../services/photos";
import { refreshMediaUrl, type RegisterDraftForm } from "../../services/registerDraft";
import type { Taster } from "../../models/place";
import { errorMessage } from "../../utils/errorMessage";
import { MAX_PHOTOS } from "./recordModel";

/** 기록 사진 고르기·삭제·대표 사진 지정입니다. 첫 번째 사진이 대표 사진입니다. */
export function useRecordPhotos({
  draft,
  editRecord,
  setError,
}: {
  draft?: RegisterDraftForm;
  editRecord?: Taster;
  setError: (message: string) => void;
}) {
  const { confirm } = useNotificationDialog();
  // 비공개 기록 사진은 짧게 유효한 서명 주소이므로, 복원할 때 새로 받은 기록의 주소가 있으면 그것을 씁니다.
  const [photos, setPhotos] = useState<string[]>(() =>
    draft ? draft.photos.map((photo) => refreshMediaUrl(photo, editRecord?.photos ?? [])) : (editRecord?.photos ?? []),
  );
  const [isBusy, setIsBusy] = useState(false);

  async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])];
    event.target.value = "";
    if (!files.length) return;
    if (files.length + photos.length > MAX_PHOTOS) {
      setError(`사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있어요.`);
      return;
    }
    setIsBusy(true);
    try {
      const images = await Promise.all(files.map(loadPhoto));
      setPhotos((current) => [...current, ...images]);
      setError("");
    } catch (cause) {
      setError(errorMessage(cause, "사진을 불러오지 못했어요."));
    } finally {
      setIsBusy(false);
    }
  }

  async function removePhotoAt(index: number) {
    const isConfirmed = await confirm({
      title: "사진을 삭제할까요?",
      message: `사진 ${index + 1}가 등록할 사진 목록에서 제외됩니다.`,
      confirmLabel: "삭제할게요",
      tone: "danger",
    });
    if (!isConfirmed) return;
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  }

  /** 고른 사진을 맨 앞으로 옮겨 대표 사진으로 씁니다. */
  function makeCoverPhoto(index: number) {
    setPhotos((current) =>
      index <= 0 || index >= current.length
        ? current
        : [current[index], ...current.filter((_, photoIndex) => photoIndex !== index)],
    );
  }

  return { photos, isBusy, addPhotos, removePhotoAt, makeCoverPhoto };
}
