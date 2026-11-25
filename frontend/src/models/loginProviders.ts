/** 다공 계정 로그인에 쓰는 소셜 제공자입니다. code는 dagong-auth 가입 상태의 loginProviders(social_identities.provider_cd)와 같습니다. */
export const LOGIN_PROVIDERS = [
  { key: "kakao", code: "KAKAO", label: "카카오", mark: "K" },
  { key: "naver", code: "NAVER", label: "네이버", mark: "N" },
] as const;
