/**
 * 개발용 샘플 맛객 계정(20000000-0000-4000-8000-00000000000N, N=1~5)의 번호를 돌려줍니다.
 * 이 ID는 infra/postgres/dev/seed-community-test-users.sql과 장소 서비스의 SamplePlaceCatalog가 함께 씁니다.
 */
function demoAccountIndex(accountId: string): number | null {
  const demoIndex = Number(accountId.slice(-1));
  return accountId.startsWith("20000000-0000-4000-8000-0000000000") && demoIndex >= 1 && demoIndex <= 5
    ? demoIndex
    : null;
}

/** 배경 사진을 등록하지 않은 맛객에게 계정별 기본 배경을 배정합니다. 샘플 계정은 번호마다 고정된 배경을 씁니다. */
export function profileCoverFor(accountId: string, uploadedUrl?: string | null): string {
  if (uploadedUrl) return uploadedUrl;
  const demoIndex = demoAccountIndex(accountId);
  if (demoIndex) return `demo-cover:${demoIndex}`;
  const hash = [...accountId].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  return `demo-cover:${(hash % 5) + 1}`;
}

/** 개발용 맛객은 일부만 사진을 등록한 상태로 보여 실제 프로필의 차이를 확인할 수 있게 합니다. 샘플 계정이 아니면 null입니다. */
export function demoTasterAvatar(accountId: string): string | null {
  const demoIndex = demoAccountIndex(accountId);
  if (!demoIndex) return null;
  // 4·5번은 사진을 등록하지 않은 계정으로 두고 기본 캐릭터를 노출합니다.
  if (demoIndex > 3) return "";
  return `demo-avatar:${demoIndex}`;
}

/** 기본 캐릭터도 샘플 맛객마다 다르게 보이도록 ID로 변형 번호를 고정합니다. */
export function avatarVariantFor(accountId: string, currentVariant: number): number {
  const demoIndex = demoAccountIndex(accountId);
  return demoIndex ? ((demoIndex * 2 + 2) % 10) + 1 : currentVariant;
}

// 이미지로 그릴 수 있는 사진 값입니다. 장소 서비스의 샘플 기록은 이니셜 같은 글자를 avatar로 주기도 합니다.
const AVATAR_SOURCE_PATTERN = /^(demo-avatar:\d$|https?:|data:image\/|blob:|\/media\/)/;

/** 맛객 사진 주소입니다. 이미지 주소가 아니면 샘플 계정의 고정 사진을 쓰고, 그것도 없으면 undefined(기본 캐릭터)입니다. */
export function avatarSource(tasterId: string, avatar?: string | null): string | undefined {
  const source = avatar?.trim();
  if (source && AVATAR_SOURCE_PATTERN.test(source)) return source;
  return demoTasterAvatar(tasterId) || undefined;
}

/** 올린 사진을 불러오지 못했을 때 대신 쓸 샘플 계정 사진입니다. avatarSource와 같으면 undefined입니다. */
export function avatarFallback(tasterId: string, avatar?: string | null): string | undefined {
  const fallback = demoTasterAvatar(tasterId) || undefined;
  return fallback && fallback !== avatarSource(tasterId, avatar) ? fallback : undefined;
}
