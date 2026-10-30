import { Avatar, ProfileCover } from "../../components/BrandAssets";
import type { Taster } from "../../models/place";
import { profileCoverFor } from "../../utils/profileMedia";

/** 가입 마지막 단계에서 넘겨 보는 맛객 카드입니다. 사진은 그 맛객의 실제 기록 사진만 씁니다. */
export default function TasterMatchCard({ taster, photos }: { taster: Taster; photos: string[] }) {
  const tags = (taster.matchedTags?.length ? taster.matchedTags : taster.profileTags ?? []).slice(0, 3);
  return (
    <article className="r-onboarding-match__card" aria-label={`${taster.tasterName}, 취향 일치 ${taster.matchScore ?? 0}%`}>
      <div className="r-onboarding-match__cover">
        <ProfileCover src={profileCoverFor(taster.tasterId, taster.profileCoverUrl)} />
        <span className="r-onboarding-match__score">취향 일치 {taster.matchScore ?? 0}%</span>
      </div>
      <div className="r-onboarding-match__body">
        <Avatar
          className="r-onboarding-match__avatar"
          src={taster.avatar || null}
          name={taster.tasterName}
          variant={taster.avatarVariant}
        />
        <div className="r-onboarding-match__name">
          <b className="r-display">{taster.tasterName}</b>
          {taster.activityRegion && <span className="r-muted">{taster.activityRegion}</span>}
        </div>
        {taster.intro && <p>{taster.intro}</p>}
        {tags.length > 0 && (
          <div className="r-tags">
            {tags.map((tag) => <span key={tag} className="r-tag">{tag}</span>)}
          </div>
        )}
        {photos.length > 0 ? (
          <div className="r-onboarding-match__photos">
            {photos.slice(0, 3).map((photo) => <img key={photo} src={photo} alt="" loading="lazy" />)}
          </div>
        ) : typeof taster.subscriberCount === "number" ? (
          <small className="r-muted">구독자 {taster.subscriberCount.toLocaleString("ko-KR")}명</small>
        ) : null}
      </div>
    </article>
  );
}
