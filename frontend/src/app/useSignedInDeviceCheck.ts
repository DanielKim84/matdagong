import { useEffect } from "react";
import { getMembership } from "../services/auth";
import { restartSignIn } from "./signIn";

/**
 * 다른 앱이나 탭에 갔다가 맛다공으로 돌아올 때 인증 서버의 가입 상태를 한 번 묻습니다.
 * 이 요청이 마지막 접속 시각을 남기고, 그사이 같은 종류의 다른 기기에서 로그인해 이 기기 로그인이 끝났으면 바로 다시 로그인합니다.
 * 앱을 쓰는 동안에는 따로 묻지 않습니다. 게이트웨이가 API 요청마다 로그인 중인지 확인해 끝난 토큰을 401로 막기 때문입니다.
 * 서버에 닿지 못한 경우는 그대로 두고 다음에 돌아올 때 다시 봅니다.
 */
export function useSignedInDeviceCheck(accessToken: string) {
  useEffect(() => {
    let active = true;
    let isRestarting = false;

    async function check() {
      if (isRestarting || document.visibilityState !== "visible") return;
      try {
        const status = await getMembership(accessToken);
        if (!active || status !== "reauthenticate") return;
        isRestarting = true;
        await restartSignIn();
      } catch {
        // 일시적인 오류는 다음에 돌아올 때 다시 봅니다.
      }
    }

    const onVisible = () => void check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [accessToken]);
}
