/**
 * 공통 인증 서버가 발급한 access token(JWT)의 payload를 화면 표시용으로 읽습니다.
 * 서명은 검증하지 않으므로 권한 판단에는 쓰지 않고, 실제 권한 확인은 서버가 합니다.
 */
export function accessTokenClaims(accessToken: string): Record<string, unknown> | null {
  try {
    const encoded = accessToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(encoded.padEnd(Math.ceil(encoded.length / 4) * 4, "="));
    // 닉네임 같은 한글 클레임도 깨지지 않도록 UTF-8로 해석합니다.
    const json = new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    const claims: unknown = JSON.parse(json);
    return claims && typeof claims === "object" ? claims as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

/** 토큰의 subject(공통 계정 UUID)입니다. 읽을 수 없으면 null입니다. */
export function accountIdFromAccessToken(accessToken: string): string | null {
  const subject = accessTokenClaims(accessToken)?.sub;
  return typeof subject === "string" && subject ? subject : null;
}
