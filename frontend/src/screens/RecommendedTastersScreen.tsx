import type { Taster } from "../models/place";
import { go } from "../app/navigation";
import { ScreenHeader } from "../components/AppChrome";
import { Avatar, ProfileCover } from "../components/BrandAssets";
import Icon from "../components/Icon";
import { profileCoverFor } from "../utils/profileMedia";

/** 취향 점수가 있는 맛객을 모아 보여줍니다. 홈 배너, 마이 화면, 빈 구독 목록에서 들어옵니다. */
export default function RecommendedTastersScreen({ tasters }: { tasters: Taster[] }) {
  return (
    <>
      <ScreenHeader title="취향 맛객 추천" fallback="subscriptions" />
      <main className="taster-recommendations">
        <section className="taster-recommendations-intro">
          <span><Icon name="sparkle" /></span>
          <div><b>내 취향에 가까운 맛객</b><p>프로필과 추천 취향을 바탕으로 잘 맞는 맛객을 모았어요.</p></div>
          <strong>{tasters.length}<small>명</small></strong>
        </section>
        {tasters.length ? (
          <div className="taster-recommendation-list">
            {tasters.map((taster) => {
              const tags = taster.matchedTags?.length
                ? taster.matchedTags
                : taster.profileTags ?? taster.tag.split(" · ").filter(Boolean);
              return (
                <button className="taster-recommendation-card" key={taster.tasterId} onClick={() => go("profile", taster.tasterId)}>
                  <span className="taster-recommendation-cover">
                    <ProfileCover className="taster-recommendation-cover-image" src={profileCoverFor(taster.tasterId, taster.profileCoverUrls?.[0] ?? taster.profileCoverUrl)} />
                    <i><Avatar src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} /></i>
                  </span>
                  <span className="taster-recommendation-copy">
                    <b>{taster.tasterName}</b>
                    <small>{taster.intro || taster.note || "나만의 맛집 취향을 기록하는 맛객이에요."}</small>
                    <span className="taster-recommendation-tags">
                      {tags.slice(0, 3).map((tag) => <i key={tag}>#{tag}</i>)}
                      {tags.length > 3 && <em>+{tags.length - 3}</em>}
                    </span>
                    <span className="taster-recommendation-meta">
                      <span><Icon name="user" /> 구독자 {taster.subscriberCount ?? 0}명</span>
                      {taster.matchScore != null && <strong><Icon name="sparkle" /> 취향 {taster.matchScore}%</strong>}
                    </span>
                  </span>
                  <Icon name="chevron" />
                </button>
              );
            })}
          </div>
        ) : (
          <section className="taster-recommendations-empty">
            <span><Icon name="sparkle" /></span>
            <b>아직 추천할 맛객을 찾지 못했어요</b>
            <p>추천 취향을 설정하면 더 잘 맞는 맛객을 찾아드릴게요.</p>
            <button className="outline-button" onClick={() => go("profile-edit", "taste")}>내 취향 설정하기</button>
          </section>
        )}
      </main>
    </>
  );
}
