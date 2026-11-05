/** 프로필 편집의 사진·배경 파일 검사와 저장된 배경 주소 읽기입니다. */
import type { MyProfile } from "../../models/community";

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_COVER_COUNT = 10;

const IMAGE_TYPE_PATTERN = /^image\/(jpeg|png|webp)$/;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const COVER_PHOTO_ID_PATTERN = /\/covers\/([0-9a-f-]{36})(?:$|[?#])/i;

export const DEFAULT_COVER_URL = "/assets/profile-cover.png";

export function isAllowedImageType(file: File): boolean {
  return IMAGE_TYPE_PATTERN.test(file.type);
}

export function isAllowedImageSize(file: File): boolean {
  return file.size <= MAX_IMAGE_BYTES;
}

/** 서버 배경 사진 주소에서 사진 id를 꺼냅니다. 예전 단일 배경처럼 id가 없으면 undefined입니다. */
export function coverPhotoId(url: string): string | undefined {
  return url.match(COVER_PHOTO_ID_PATTERN)?.[1];
}

/** 여러 장 배경이 없으면 예전 단일 배경을 한 장짜리 목록으로 씁니다. */
export function savedCoverUrls(profile: MyProfile): string[] {
  if (profile.profileCoverUrls?.length) return profile.profileCoverUrls;
  return profile.profileCoverUrl ? [profile.profileCoverUrl] : [];
}
