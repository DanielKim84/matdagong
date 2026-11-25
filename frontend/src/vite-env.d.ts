/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API Gateway 주소(기본값 /api, 개발 서버 프록시 사용). */
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_KAKAO_MAP_APP_KEY?: string;
  /** 공통 인증 서버(dagong-auth) 주소. 기본값 http://localhost:5840 */
  readonly VITE_AUTH_SERVER_URL?: string;
  /** 공통 인증 서버에 등록한 공개 클라이언트 ID. 기본값 matdagong-web-dev */
  readonly VITE_AUTH_CLIENT_ID?: string;
  /** 인증 뒤 돌아올 주소. 기본값 현재 origin + /auth/callback */
  readonly VITE_AUTH_REDIRECT_URI?: string;
  /** 등록된 테마 ID(src/theme/themes.ts). 비우거나 잘못된 ID면 기본 테마를 씁니다. */
  readonly VITE_APP_THEME?: string;
  /** "true"면 발견 지도에 AI 추천 칩을 보여 줍니다(비용 검토 전까지 기본 꺼짐). */
  readonly VITE_FEATURE_AI_PICK?: string;
}
