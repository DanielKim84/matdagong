import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { ProfileCover } from "../../components/BrandAssets";
import HashTag from "../../components/HashTag";
import TasteScore from "../../components/TasteScore";
import type { Taster } from "../../models/place";
import { activityLabel, coverOf, introOf, tagsOf } from "./tasterData";
import TasterAvatar from "../../components/TasterAvatar";

/** 카드 한 장에 보여 줄 취향 태그 수 */
const CARD_TAG_LIMIT = 2;

/** 추천 맛객 카드: 커버 위 신뢰·취향 %, 아바타, 소개, 태그, 구독 버튼 */
export default function RecommendCard({ taster }: { taster: Taster }) {
  const app = useAppData();
  const tags = taster.matchedTags?.length ? taster.matchedTags : tagsOf(taster);
  const area = activityLabel(taster);
  return (
    <article className="r-card r-tasters-rec">
      <button
        type="button"
        className="r-tasters-rec__open"
        onClick={() => go("profile", taster.tasterId)}
        aria-label={`${taster.tasterName} 프로필 보기`}
      >
        <span className="r-tasters-rec__cover">
          <ProfileCover src={coverOf(taster)} />
          <TasteScore taster={taster} />
        </span>
        <span className="r-tasters-rec__copy">
          <TasterAvatar taster={taster} className="r-tasters-avatar r-tasters-avatar--ring" />
          <b className="r-display">{taster.tasterName}</b>
          <small>
            {area ? `${area} · ` : ""}
            {introOf(taster)}
          </small>
          {tags.length > 0 && (
            <span className="r-tags">
              {tags.slice(0, CARD_TAG_LIMIT).map((tag) => (
                <HashTag key={tag} tag={tag} size="sm" />
              ))}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        className="r-button r-button--primary r-button--pill r-tasters-rec__cta"
        onClick={() => app.actions.openSubscription(taster.tasterId)}
      >
        구독하기
      </button>
    </article>
  );
}
