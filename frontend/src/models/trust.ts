import type { Taster } from "./place";

/**
 * 같은 맛집 경험으로 쌓인 맛객 신뢰 등급입니다(커뮤니티 서비스 TasteTrust가 계산). 등급은 잘게 나누지 않습니다.
 * 함께 다녀온 맛집이 10곳 미만이면 LEARNING, 80% 이상이면 믿고 가는 맛객(TRUSTED), 10% 미만이면 입맛이 다른 편입니다.
 */
export type TrustLevel = "LEARNING" | "NORMAL" | "TRUSTED" | "DIFFERENT";

/** 등급마다 화면에 쓰는 이름입니다. 나머지 등급은 따로 이름을 보여 주지 않습니다. */
export const TRUST_LEVEL_LABELS: Partial<Record<TrustLevel, string>> = {
  TRUSTED: "믿고 가는 맛객",
  DIFFERENT: "입맛이 다른 편",
};

export type TrustTaster = Pick<Taster, "trustScore" | "trustLevel" | "matchScore">;

/** 지도 핀 별 표식과 목록 앞자리에 쓰는 '믿고 가는 맛객'(신뢰 80% 이상, 함께 다녀온 맛집 10곳 이상)인지 확인합니다. */
export function isTrustedTaster(taster: TrustTaster): boolean {
  return taster.trustLevel === "TRUSTED";
}

/** 믿고 가는 맛객 → 신뢰 % → 취향 % 순으로 비교합니다. 정렬 비교 함수에 그대로 씁니다. */
export function compareByTrust(left: TrustTaster, right: TrustTaster): number {
  return (
    Number(isTrustedTaster(right)) - Number(isTrustedTaster(left)) ||
    (right.trustScore ?? -1) - (left.trustScore ?? -1) ||
    (right.matchScore ?? 0) - (left.matchScore ?? 0)
  );
}

/**
 * 글자 하나로만 보여 줄 자리(맛집 상세의 맛객 고르기 줄 등)의 점수입니다. 입맛이 다른 편이면 그 이름을, 아니면 같은 맛집 경험이 있을 때 "신뢰 N%", 없을 때 "취향 N%"를 돌려줍니다.
 * 칩으로 보여 줄 때는 신뢰·취향을 나란히 두는 TasteScore를 씁니다. 보여 줄 값이 없으면 빈 문자열입니다.
 */
export function tasteScoreLabel(taster: TrustTaster): string {
  if (taster.trustLevel === "DIFFERENT") return TRUST_LEVEL_LABELS.DIFFERENT ?? "";
  if (taster.trustScore != null) return `신뢰 ${taster.trustScore}%`;
  return taster.matchScore ? `취향 ${taster.matchScore}%` : "";
}
