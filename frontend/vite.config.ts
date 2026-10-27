import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
});
