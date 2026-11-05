/** 앱 진입점입니다. 테마·전역 스타일을 적용하고 로그인 상태를 확인한 뒤 앱을 그립니다. */
import { beginSignIn, clearPendingSignIn, completeSignIn, rememberReturnHash, restartSignIn } from "./app/signIn";
import { renderMatdagong, showSignInError, showStartupStatus } from "./app/startupView";
import { clearStoredAccessToken, getMembership, readStoredAccessToken } from "./services/auth";
import { SESSION_EXPIRING_EVENT, setSessionExpiredHandler } from "./services/http";
import { applyTheme } from "./theme/applyTheme";
import { installMouseDragScroll } from "./utils/dragScroll";
import { errorMessage } from "./utils/errorMessage";
import "./theme/index.css";
import "./styles/app.css";
import "./styles/auth-start.css";
import "./styles/profile-settings.css";
import "./styles/design-system.css";
import "./styles/photo-tag-detail.css";
import "./styles/a/forms.css";
import "./styles/renewal/index.css";

const CALLBACK_PATH = "/auth/callback";

async function startMatdagong(): Promise<void> {
  const root = document.getElementById("root");
  if (!root) return;

  // 과거에 사용하던 맛다공 /login 주소는 앱 진입 주소로 정리합니다.
  if (window.location.pathname === "/login") {
    window.history.replaceState(null, "", "/");
  }

  try {
    const isCallback = window.location.pathname === CALLBACK_PATH;
    showStartupStatus(isCallback ? "로그인 결과를 확인하고 있어요…" : "맛다공에 접속하고 있어요…");
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
  } catch (cause) {
    clearPendingSignIn();
    showSignInError(errorMessage(cause, "잠시 후 다시 시도해 주세요."));
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
    showSignInError("로그인을 다시 시작하지 못했어요. 다시 시도해 주세요.");
  });
}

// 첫 화면을 그리기 전에 테마를 정해 기본 색이 잠깐 보였다가 바뀌지 않게 합니다.
applyTheme();
installMouseDragScroll();
setSessionExpiredHandler(restartExpiredSession);

// 맛다공은 먼저 홈 진입을 시도하고, 유효한 로그인 정보가 없으면 공통 인증을 시작합니다.
void startMatdagong();
