import { useEffect, useState } from "react";
import { isAllowedImageSize, isAllowedImageType } from "./profileImages";

/** 저장 전 프로필 사진 변경(새 파일·기본 캐릭터로 되돌림)과 미리보기 주소를 들고 있습니다. */
export function useAvatarDraft(onError: (message: string) => void) {
  const [file, setFile] = useState<File>();
  const [isRemoved, setIsRemoved] = useState(false);
  const [preview, setPreview] = useState<string>();

  useEffect(() => {
    if (!file) {
      setPreview(undefined);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function choose(next: File | undefined) {
    if (!next) return;
    if (!isAllowedImageType(next)) {
      onError("JPG, PNG, WEBP 이미지 파일을 선택해 주세요.");
      return;
    }
    if (!isAllowedImageSize(next)) {
      onError("이미지는 5MB 이하로 선택해 주세요.");
      return;
    }
    setFile(next);
    setIsRemoved(false);
  }

  function remove() {
    setFile(undefined);
    setIsRemoved(true);
  }

  function reset() {
    setFile(undefined);
    setIsRemoved(false);
  }

  return { file, isRemoved, preview, choose, remove, reset };
}
