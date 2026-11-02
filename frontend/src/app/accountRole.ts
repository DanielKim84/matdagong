import { accessTokenClaims } from "../utils/accessToken";
import type { AccountRole } from "./AppData";

/**
 * 마이 화면 배지에 보여줄 역할입니다. 관리자·슈퍼 맛객은 공통 계정 토큰의 roles/authorities에서 읽고,
 * 맛객 여부는 공개 기록이 있는지로 계산합니다. 표시용일 뿐 실제 권한 확인은 서버가 합니다.
 */
export function accountRole(accessToken: string, hasPublicRecord: boolean): AccountRole {
  const claims = accessTokenClaims(accessToken);
  // 표시용 권한을 읽지 못해도 공개 기록 여부로 기본 역할을 보여줍니다.
  const values: unknown[] = [claims?.roles, claims?.authorities].flatMap((value) =>
    Array.isArray(value) ? value : value ? [value] : [],
  );
  const roles = values.map((value) =>
    typeof value === "string"
      ? value.toUpperCase()
      : value && typeof value === "object" && "authority" in value
        ? String(value.authority).toUpperCase()
        : "",
  );
  if (roles.some((role) => role === "ADMIN" || role === "ROLE_ADMIN")) return "ADMIN";
  if (roles.some((role) => role === "SUPER_TASTER" || role === "ROLE_SUPER_TASTER")) return "SUPER_TASTER";
  return hasPublicRecord ? "TASTER" : "USER";
}
