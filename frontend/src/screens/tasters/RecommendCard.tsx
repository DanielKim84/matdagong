import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import { Avatar, ProfileCover } from "../../components/BrandAssets";
import type { Taster } from "../../models/place";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import { activityLabel, coverOf, introOf, tagsOf } from "./tasterData";

/** 취향 일치 맛객 카드: 커버 위 일치율, 아바타, 소개, 태그, 구독 버튼 */
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
          {taster.matchScore != null && <span className="r-match">취향 {taster.matchScore}%</span>}
        </span>
        <span className="r-tasters-rec__copy">
          <Avatar
            className="r-tasters-avatar r-tasters-avatar--ring"
            src={avatarSource(taster.tasterId, taster.avatar)}
            fallbackSrc={avatarFallback(taster.tasterId, taster.avatar)}
            name={taster.tasterName}
            variant={taster.avatarVariant}
          />
          <b className="r-display">{taster.tasterName}</b>
          <small>
            {area ? `${area} · ` : ""}
            {introOf(taster)}
          </small>
          {tags.length > 0 && (
            <span className="r-tags">
              {tags.slice(0, 2).map((tag) => (
                <span key={tag} className="r-tag">
                  {tag}
                </span>
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
