import { accessTokenClaims } from "../utils/accessToken";
import type { AccountRole } from "./AppData";

/**
 * 마이 화면 배지에 보여줄 역할입니다. 관리자·슈퍼 맛객은 공통 계정 토큰의 roles 클레임(인증 서버 account_roles.role_cd 목록,
 * ClientRegistrationConfig)에서 읽고, 맛객 여부는 공개 기록이 있는지로 계산합니다. 표시용일 뿐 실제 권한 확인은 서버가 합니다.
 */
export function accountRole(accessToken: string, hasPublicRecord: boolean): AccountRole {
  // 표시용 권한을 읽지 못해도 공개 기록 여부로 기본 역할을 보여줍니다.
  const roles = accessTokenClaims(accessToken)?.roles;
  const has = (role: string) => Array.isArray(roles) && roles.includes(role);
  if (has("ADMIN")) return "ADMIN";
  if (has("SUPER_TASTER")) return "SUPER_TASTER";
  return hasPublicRecord ? "TASTER" : "USER";
}
