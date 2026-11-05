import { ProfileCover } from "../../components/BrandAssets";
import HashTag from "../../components/HashTag";
import type { Taster } from "../../models/place";
import { formatNumber } from "../../utils/format";
import TasterAvatar from "../../components/TasterAvatar";
import { profileCoverFor } from "../../utils/profileMedia";

/** 카드 한 장에 보여 줄 취향 태그 수 */
const CARD_TAG_LIMIT = 3;

/** 가입 마지막 단계에서 넘겨 보는 맛객 카드입니다. 사진은 그 맛객의 실제 기록 사진만 쓰고, 장 수는 loadMatches가 제한합니다. */
export default function TasterMatchCard({ taster, photos }: { taster: Taster; photos: string[] }) {
  const tags = (taster.matchedTags?.length ? taster.matchedTags : (taster.profileTags ?? [])).slice(0, CARD_TAG_LIMIT);
  return (
    <article
      className="r-onboarding-match__card"
      aria-label={`${taster.tasterName}, 취향 일치 ${taster.matchScore ?? 0}%`}
    >
      <div className="r-onboarding-match__cover">
        <ProfileCover src={profileCoverFor(taster.tasterId, taster.profileCoverUrl)} />
        <span className="r-onboarding-match__score">취향 일치 {taster.matchScore ?? 0}%</span>
      </div>
      <div className="r-onboarding-match__body">
        <TasterAvatar taster={taster} className="r-onboarding-match__avatar" />
        <div className="r-onboarding-match__name">
          <b className="r-display">{taster.tasterName}</b>
          {taster.activityRegion && <span className="r-muted">{taster.activityRegion}</span>}
        </div>
        {taster.intro && <p>{taster.intro}</p>}
        {tags.length > 0 && (
          <div className="r-tags">
            {tags.map((tag) => (
              <HashTag key={tag} tag={tag} size="sm" />
            ))}
          </div>
        )}
        {photos.length > 0 ? (
          <div className="r-onboarding-match__photos">
            {photos.map((photo) => (
              <img key={photo} src={photo} alt="" loading="lazy" />
            ))}
          </div>
        ) : typeof taster.subscriberCount === "number" ? (
          <small className="r-muted">구독자 {formatNumber(taster.subscriberCount)}명</small>
        ) : null}
      </div>
    </article>
  );
}
