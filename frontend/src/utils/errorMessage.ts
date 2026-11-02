/**
 * 실패 원인에서 사용자에게 보여 줄 문구를 꺼냅니다. 서버 오류(ApiError)는 서버가 준 한국어 문구를 그대로 쓰고,
 * Error가 아니거나 문구가 비어 있으면 fallback을 씁니다. `.catch((cause: Error) => ...)` 같은 타입 단정 대신 씁니다.
 */
export function errorMessage(cause: unknown, fallback: string): string {
  return cause instanceof Error && cause.message.trim() ? cause.message : fallback;
}
