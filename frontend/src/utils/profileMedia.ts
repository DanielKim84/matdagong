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
