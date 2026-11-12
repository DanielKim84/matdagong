import { useEffect, useState } from "react";
import { checkNicknameAvailable } from "../services/community";

/**
 * 닉네임 미리 확인 결과입니다. idle은 묻지 않은 상태(빈 이름·지금 내 이름), unknown은 확인에 실패한 상태입니다.
 * unknown이어도 저장은 막지 않습니다. 저장 요청(가입·프로필 수정)이 서버에서 한 번 더 확인해 409로 알려 줍니다.
 */
export type NicknameCheck = "idle" | "checking" | "available" | "taken" | "unknown";

/** 입력을 멈춘 뒤 묻기까지 기다리는 시간입니다. 글자마다 요청하지 않게 짧게 모읍니다. */
const NICKNAME_CHECK_DELAY_MS = 300;

/**
 * 입력 중인 닉네임을 다른 맛객이 쓰는지 서버(UserProfileController.nicknameAvailability)에 묻습니다.
 * 가입 1단계(SignupNameStep)와 프로필 편집(useProfileForm)이 같이 씁니다. 결과는 NicknameCheckNote가 입력칸 아래에 보여 줍니다.
 */
export function useNicknameCheck(accessToken: string, nickname: string, ownNickname = ""): NicknameCheck {
  const trimmed = nickname.trim();
  const shouldCheck = !!trimmed && trimmed !== ownNickname;
  // 어떤 이름에 대한 결과인지 함께 둬서, 입력이 바뀐 뒤 늦게 온 이전 결과를 보여 주지 않습니다.
  const [result, setResult] = useState<{ nickname: string; check: NicknameCheck }>({ nickname: "", check: "idle" });

  useEffect(() => {
    if (!shouldCheck) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      checkNicknameAvailable(accessToken, trimmed, controller.signal)
        .then((isAvailable) => setResult({ nickname: trimmed, check: isAvailable ? "available" : "taken" }))
        .catch(() => {
          if (!controller.signal.aborted) setResult({ nickname: trimmed, check: "unknown" });
        });
    }, NICKNAME_CHECK_DELAY_MS);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [accessToken, trimmed, shouldCheck]);

  if (!shouldCheck) return "idle";
  return result.nickname === trimmed ? result.check : "checking";
}
