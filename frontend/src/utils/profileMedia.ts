/** 프로필 이미지를 등록하지 않은 맛객에게 계정별 기본 커버를 배정합니다. */
export function profileCoverFor(accountId: string, uploadedUrl?: string | null): string {
  if (uploadedUrl) return uploadedUrl;
  const demoIndex = Number(accountId.slice(-1));
  const isDemoAccount = accountId.startsWith("20000000-0000-4000-8000-0000000000")
    && demoIndex >= 1 && demoIndex <= 5;
  if (isDemoAccount) return `demo-cover:${demoIndex}`;
  const hash = [...accountId].reduce((value, char) => (value * 31 + char.charCodeAt(0)) >>> 0, 0);
  return `demo-cover:${(hash % 5) + 1}`;
}

/** 개발용 맛객은 일부만 사진을 등록한 상태로 보여 실제 프로필의 차이를 확인할 수 있게 합니다. */
export function demoTasterAvatar(accountId: string): string | null {
  const demoIndex = Number(accountId.slice(-1));
  if (!accountId.startsWith("20000000-0000-4000-8000-0000000000") || demoIndex < 1 || demoIndex > 5) return null;
  // 4·5번은 사진을 등록하지 않은 계정으로 두고 기본 캐릭터를 노출합니다.
  if (demoIndex > 3) return "";
  return `demo-avatar:${demoIndex}`;
}

/** 기본 캐릭터도 더미 맛객마다 다르게 보이도록 ID로 변형 번호를 고정합니다. */
export function avatarVariantFor(accountId: string, currentVariant: number): number {
  const demoIndex = Number(accountId.slice(-1));
  if (accountId.startsWith("20000000-0000-4000-8000-0000000000") && demoIndex >= 1 && demoIndex <= 5) {
    return ((demoIndex * 2 + 2) % 10) + 1;
  }
  return currentVariant;
}
