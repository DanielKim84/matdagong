import type { NicknameCheck } from "../hooks/useNicknameCheck";

/** 다른 맛객이 쓰는 닉네임 안내입니다. 커뮤니티 서버 UserProfileService.NICKNAME_TAKEN과 같은 문구입니다. */
export const NICKNAME_TAKEN_MESSAGE = "이미 사용 중인 닉네임이에요.";

const NOTES: Record<"checking" | "available" | "taken", string> = {
  checking: "겹치는 닉네임이 있는지 보고 있어요…",
  available: "쓸 수 있는 닉네임이에요.",
  taken: `${NICKNAME_TAKEN_MESSAGE} 다른 이름을 정해 주세요.`,
};

/**
 * useNicknameCheck 결과를 닉네임 입력칸 아래 한 줄로 알립니다. 묻지 않았거나(idle) 확인에 실패하면(unknown) 그리지 않습니다.
 * 프로필 편집에서는 label 안에 들어가므로 p 대신 span으로 그립니다.
 */
export default function NicknameCheckNote({ check, id }: { check: NicknameCheck; id?: string }) {
  if (check === "idle" || check === "unknown") return null;
  return (
    <span
      id={id}
      className={`r-nickname-check ${check === "available" ? "is-ok" : check === "taken" ? "is-taken" : ""}`}
      role={check === "taken" ? "alert" : "status"}
    >
      {NOTES[check]}
    </span>
  );
}
