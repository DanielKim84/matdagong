/** 앱 진입점입니다. 테마·전역 스타일을 적용하고 로그인 상태를 확인한 뒤 앱을 그립니다. */
import { beginSignIn, clearPendingSignIn, completeSignIn, rememberReturnHash, restartSignIn } from "./app/signIn";
import { renderMatdagong, showSignInError, showStartupStatus } from "./app/startupView";
import { clearStoredAccessToken, getMembership, readStoredAccessToken } from "./services/auth";
import { SESSION_EXPIRING_EVENT, setSessionExpiredHandler } from "./services/http";
import { applyTheme } from "./theme/applyTheme";
import { installMouseDragScroll } from "./utils/dragScroll";
import "./theme/index.css";
import "./styles/app.css";
import "./styles/auth-start.css";
import "./styles/profile-settings.css";
import "./styles/design-system.css";
import "./styles/profile/forms.css";
import "./styles/screens/index.css";

const CALLBACK_PATH = "/auth/callback";

async function startMatdagong(): Promise<void> {
  const root = document.getElementById("root");
  if (!root) return;

  try {
    const isCallback = window.location.pathname === CALLBACK_PATH;
    showStartupStatus();
    if (isCallback) await completeSignIn();

    const accessToken = readStoredAccessToken();
    if (!accessToken) {
      clearStoredAccessToken();
      // 공유받은 /#place/<id> 같은 주소로 처음 들어와도 로그인 뒤 같은 화면을 엽니다.
      rememberReturnHash();
      await beginSignIn();
      return;
    }

    const membership = await getMembership(accessToken);
    if (membership === "reauthenticate") {
      await restartSignIn();
      return;
    }
    renderMatdagong(root, accessToken, membership);
  } catch {
    clearPendingSignIn();
    showSignInError();
  }
}

/**
 * API 요청 중 토큰이 만료되거나 401을 받으면 http.ts가 한 번만 호출합니다.
 * 화면에 입력 보관을 알리고, 현재 해시 경로를 기억한 뒤 공통 인증을 다시 거칩니다.
 * 인증 서버의 SSO 세션이 살아 있으면 로그인 화면 없이 바로 콜백으로 돌아옵니다.
 */
function restartExpiredSession(): void {
  // 이벤트 처리기는 동기로 실행되므로 페이지를 떠나기 전에 작성 중 입력이 저장됩니다.
  window.dispatchEvent(new Event(SESSION_EXPIRING_EVENT));
  rememberReturnHash();
  beginSignIn().catch(() => {
    showSignInError();
  });
}

// 첫 화면을 그리기 전에 테마를 정해 기본 색이 잠깐 보였다가 바뀌지 않게 합니다.
applyTheme();
installMouseDragScroll();
setSessionExpiredHandler(restartExpiredSession);

void startMatdagong();
