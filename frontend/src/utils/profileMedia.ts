/** 맛객 사진·배경의 기본값 고르기입니다. */
import { stableHash } from "./stableHash";

/** 기본 배경 장면 수입니다. components/BrandAssets의 ProfileCover가 그리는 장면 수와 같습니다. */
const DEFAULT_COVER_COUNT = 5;

/** 배경 사진을 등록하지 않은 맛객에게 계정 ID로 늘 같은 기본 배경("default-cover:N")을 배정합니다. */
export function profileCoverFor(accountId: string, uploadedUrl?: string | null): string {
  if (uploadedUrl) return uploadedUrl;
  return `default-cover:${(stableHash(accountId) % DEFAULT_COVER_COUNT) + 1}`;
}

// 이미지로 그릴 수 있는 사진 값입니다(서버 /media 주소, 고르는 중인 미리 보기). 그 밖의 글자는 사진으로 쓰지 않습니다.
const AVATAR_SOURCE_PATTERN = /^(https?:|data:image\/|blob:|\/media\/)/;

/** 맛객 사진 주소입니다. 이미지 주소가 아니면 undefined이고, 화면은 계정별 기본 캐릭터를 그립니다. */
export function avatarSource(avatar?: string | null): string | undefined {
  const source = avatar?.trim();
  return source && AVATAR_SOURCE_PATTERN.test(source) ? source : undefined;
}
