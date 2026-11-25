import { go } from "../../app/navigation";
import { ProfileCover } from "../../components/BrandAssets";
import type { Taster } from "../../models/place";
import { tasteScoreLabel } from "../../models/trust";
import { activityLabel, coverOf, introOf } from "./tasterData";

/**
 * 취향이 잘 맞는 맛객 맨 위의 큰 추천 카드(보드 08-01): 맛객의 배경 사진 위에 "추천 맛객" 이름표, 이름,
 * "신뢰·취향 % · 지역", 소개 한마디를 얹습니다. 누르면 프로필로 갑니다(구독은 프로필에서).
 */
export default function RecommendCard({ taster }: { taster: Taster }) {
  const area = activityLabel(taster);
  const score = tasteScoreLabel(taster);
  return (
    <button
      type="button"
      className="r-tasters-feature"
      onClick={() => go("profile", taster.tasterId)}
      aria-label={`${taster.tasterName} 프로필 보기`}
    >
      <ProfileCover src={coverOf(taster)} />
      <span className="r-tasters-feature__copy">
        <em>추천 맛객</em>
        <b className="r-display">{taster.tasterName}</b>
        {(score || area) && <small>{[score, area].filter(Boolean).join(" · ")}</small>}
        <span>“{introOf(taster)}”</span>
      </span>
    </button>
  );
}
