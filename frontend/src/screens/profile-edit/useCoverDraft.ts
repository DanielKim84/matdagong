import { useEffect, useState } from "react";
import type { MyProfile } from "../../models/community";
import {
  DEFAULT_COVER_URL,
  MAX_COVER_COUNT,
  MAX_IMAGE_SIZE_LABEL,
  coverPhotoId,
  isAllowedImageSize,
  isAllowedImageType,
} from "./profileImages";

/** 저장 전 배경 사진 변경(새 파일, 지울 서버 사진)과 미리보기 갤러리를 들고 있습니다. */
export function useCoverDraft(profile: MyProfile, onError: (message: string) => void) {
  const [files, setFiles] = useState<File[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);

  useEffect(() => {
    if (!files.length) {
      setPreviews([]);
      return;
    }
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [files]);

  const existingUrls = profile.profileCoverUrls.filter((url) => {
    const photoId = coverPhotoId(url);
    return !photoId || !removedPhotoIds.includes(photoId);
  });
  const gallery = [...existingUrls, ...previews];
  const activePreview = gallery[previewIndex] ?? DEFAULT_COVER_URL;

  function choose(fileList: FileList | null) {
    if (!fileList?.length) return;
    const selected = [...fileList];
    const existingCount = Math.max(0, profile.profileCoverUrls.length - removedPhotoIds.length);
    if (selected.length + files.length + existingCount > MAX_COVER_COUNT) {
      onError(`프로필 배경은 최대 ${MAX_COVER_COUNT}장까지 등록할 수 있어요.`);
      return;
    }
    if (selected.some((file) => !isAllowedImageType(file) || !isAllowedImageSize(file))) {
      onError(`JPG, PNG, WEBP 이미지 파일을 장당 ${MAX_IMAGE_SIZE_LABEL} 이하로 선택해 주세요.`);
      return;
    }
    setFiles((current) => [...current, ...selected]);
    setPreviewIndex(existingCount + files.length);
  }

  /** 갤러리 index번 사진을 지웁니다. 서버 사진은 저장할 때 지워집니다. */
  function removeAt(index: number) {
    if (index < existingUrls.length) {
      const photoId = coverPhotoId(existingUrls[index]);
      if (photoId) setRemovedPhotoIds((current) => (current.includes(photoId) ? current : [...current, photoId]));
    } else {
      const localIndex = index - existingUrls.length;
      setFiles((current) => current.filter((_, fileIndex) => fileIndex !== localIndex));
    }

    const remainingCount = gallery.length - 1;
    setPreviewIndex((current) => {
      if (remainingCount <= 0) return 0;
      if (current > index) return current - 1;
      if (current === index) return Math.min(index, remainingCount - 1);
      return current;
    });
  }

  /** 저장이 끝난 파일은 비워 다음 저장에서 같은 이미지를 다시 올리지 않습니다. */
  function reset() {
    setFiles([]);
    setRemovedPhotoIds([]);
    setPreviewIndex(0);
  }

  return {
    files,
    removedPhotoIds,
    gallery,
    activePreview,
    previewIndex,
    setPreviewIndex,
    choose,
    removeAt,
    reset,
  };
}
