/** 프로필 편집의 사진·배경 파일 검사와 배경 사진 주소의 id 읽기입니다. */

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";
export const MAX_COVER_COUNT = 10;

const IMAGE_TYPE_PATTERN = /^image\/(jpeg|png|webp)$/;
const MAX_IMAGE_MB = 5;
const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
/** 안내 문구는 이 값을 써서 한도를 바꿀 때 문구가 따로 남지 않게 합니다. */
export const MAX_IMAGE_SIZE_LABEL = `${MAX_IMAGE_MB}MB`;
const COVER_PHOTO_ID_PATTERN = /\/covers\/([0-9a-f-]{36})(?:$|[?#])/i;

export const DEFAULT_COVER_URL = "/assets/profile-cover.png";

export function isAllowedImageType(file: File): boolean {
  return IMAGE_TYPE_PATTERN.test(file.type);
}

export function isAllowedImageSize(file: File): boolean {
  return file.size <= MAX_IMAGE_BYTES;
}

/** 서버 배경 사진 주소(/media/profiles/<계정>/covers/<id>)에서 사진 id를 꺼냅니다. 형식이 다르면 undefined입니다. */
export function coverPhotoId(url: string): string | undefined {
  return url.match(COVER_PHOTO_ID_PATTERN)?.[1];
}
