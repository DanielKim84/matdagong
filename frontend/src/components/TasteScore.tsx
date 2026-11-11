import { isTrustedTaster, type TrustTaster } from "../models/trust";
import Icon from "./Icon";

/**
 * 맛객 옆 신뢰·취향 칩입니다. 같은 맛집 경험이 있으면 초록 "신뢰 N%"(인증 표시), 프로필 취향이 겹치면 노란 "취향 N%"를
 * 나란히 둡니다. 화면마다 같은 모양을 쓰도록 이 부품 하나로만 그립니다.
 * 믿고 가는 맛객이면 신뢰 칩을 한 단계 진하게, 입맛이 다른 편이면 회색으로 낮춥니다. 보여 줄 값이 없으면 그리지 않습니다.
 */
export default function TasteScore({ taster }: { taster: TrustTaster }) {
  const hasTrust = taster.trustScore != null;
  const hasTaste = !!taster.matchScore;
  if (!hasTrust && !hasTaste) return null;
  const trustTone = isTrustedTaster(taster) ? "is-trusted" : taster.trustLevel === "DIFFERENT" ? "is-different" : "";
  return (
    <span className="r-scores">
      {hasTrust && (
        <span className={`r-match r-match--trust ${trustTone}`}>
          <Icon name="seal-check" />
          신뢰 {taster.trustScore}%
        </span>
      )}
      {hasTaste && <span className="r-match r-match--taste">취향 {taster.matchScore}%</span>}
    </span>
  );
}
