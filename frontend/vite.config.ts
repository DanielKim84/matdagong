import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

// main.tsx와 같은 기본값을 써서 환경 변수가 없을 때도 인증 서버 주소가 어긋나지 않게 합니다.
const DEFAULT_AUTH_SERVER_URL = "http://localhost:5840";

/**
 * 배포 빌드의 index.html에만 Content-Security-Policy meta를 넣습니다.
 * 개발 서버는 Vite가 React Refresh용 인라인 스크립트를 넣으므로 적용하지 않습니다(apply: "build").
 *
 * frame-ancestors(클릭재킹 방지)는 meta 태그에서 무시되므로, 배포 시 웹 서버/게이트웨이에서
 * `Content-Security-Policy: frame-ancestors 'none'` 응답 헤더(또는 X-Frame-Options: DENY)로 설정해야 합니다.
 */
function contentSecurityPolicy(authServerUrl: string): Plugin {
  const authOrigin = new URL(authServerUrl).origin;
  const policy = [
    "default-src 'self'",
    // Kakao 지도 SDK와 장소 검색(JSONP), SDK가 이어서 불러오는 daumcdn 스크립트를 허용합니다.
    "script-src 'self' https://dapi.kakao.com https://*.daumcdn.net",
    // Kakao 지도는 인라인 style을 쓰고, Pretendard 글꼴 CSS는 jsDelivr에서 받습니다.
    "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    // 등록 사진 미리보기(data:/blob:)와 지도 타일·마커 이미지를 허용합니다.
    "img-src 'self' data: blob: https://*.daumcdn.net https://*.kakao.com https://*.kakaocdn.net",
    "font-src 'self' https://cdn.jsdelivr.net data:",
    `connect-src 'self' ${authOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${authOrigin}`,
  ].join("; ");

  return {
    name: "matdagong-content-security-policy",
    apply: "build",
    transformIndexHtml(html) {
      const charset = /<meta\s+charset=["']?[\w-]+["']?\s*\/?>/i;
      if (!charset.test(html)) {
        throw new Error("index.html에서 charset meta를 찾지 못해 CSP를 넣을 수 없어요.");
      }
      // charset 바로 다음, 다른 리소스보다 먼저 정책이 적용되도록 넣습니다.
      return html.replace(
        charset,
        (match) => `${match}\n    <meta http-equiv="Content-Security-Policy" content="${policy}" />`,
      );
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const authServerUrl = env.VITE_AUTH_SERVER_URL || DEFAULT_AUTH_SERVER_URL;

  return {
    plugins: [react(), contentSecurityPolicy(authServerUrl)],
    server: {
      // 맛다공 화면은 4845에서 제공하며 각 API 경로를 해당 백엔드 포트로 전달합니다.
      port: 4845,
      strictPort: true,
      proxy: {
        // 화면 API는 Gateway 한 곳으로 보내고, Gateway가 각 기능 서비스로 전달합니다.
        "/api": "http://localhost:5843",
        "/media": "http://localhost:5843",
        // Authorization Code 교환은 브라우저와 같은 origin으로 요청해 개발 환경의 CORS를 피합니다.
        "/oauth2": "http://localhost:5840",
        // 맛다공 가입 상태 조회와 서비스 가입은 인증 서버가 access token을 검증합니다.
        "/auth-api": {
          target: "http://localhost:5840",
          rewrite: (path) => path.replace(/^\/auth-api/, ""),
        },
      },
    },
  };
});
