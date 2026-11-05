import { isTrustedTaster, tasteScoreLabel, type TrustTaster } from "../models/trust";
import Icon from "./Icon";

/**
 * 맛객 옆 작은 점수 칩입니다. 같은 맛집 경험이 있으면 신뢰 %(믿고 가는 맛객이면 별을 붙인 노란 칩), 없으면 취향 %를 보여 줍니다.
 * 보여 줄 값이 없으면 그리지 않습니다.
 */
export default function TasteScore({ taster }: { taster: TrustTaster }) {
  const label = tasteScoreLabel(taster);
  if (!label) return null;
  const isTrusted = isTrustedTaster(taster);
  const tone = isTrusted
    ? "r-match--trusted"
    : taster.trustLevel === "DIFFERENT"
      ? "r-match--different"
      : taster.trustScore != null
        ? "r-match--trust"
        : "";
  return (
    <span className={`r-match ${tone}`}>
      {isTrusted && <Icon name="star" filled />}
      {label}
    </span>
  );
}
