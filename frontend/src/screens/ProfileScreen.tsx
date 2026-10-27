import { useState } from "react";
import type { Place, Taster } from "../models/place";
import { go } from "../app/navigation";
import { Avatar, FoodPhoto } from "../components/BrandAssets";
import Icon from "../components/Icon";

export default function ProfileScreen({
  taster,
  places,
  subscribed,
  onSubscribe,
}: {
  taster: Taster;
  places: Place[];
  subscribed: boolean;
  onSubscribe: () => void;
}) {
  const [tab, setTab] = useState("맛집");
  const own = places.filter((place) =>
    place.tasters.some((item) => item.tasterId === taster.tasterId),
  );
  return (
    <main className="profile-screen">
      <div className="profile-cover">
        <img
          src={taster.profileCoverUrl || "/assets/profile-cover.png"}
          alt="맛객 프로필 커버"
        />
        <button
          className="photo-back icon-button"
          onClick={() => go("home")}
          aria-label="홈으로 돌아가기"
        >
          <Icon name="back" />
        </button>
        <div className="hero-photo-actions">
          <button onClick={() => go("saved")} aria-label="내 스크랩">
            <Icon name="bookmark" />
          </button>
        </div>
      </div>
      <section className="profile-body">
        <Avatar
          className="profile-avatar"
          src={taster.avatar}
          name={taster.tasterName}
          variant={taster.avatarVariant}
        />
        <h1>{taster.tasterName}</h1>
        <span className="profile-handle">
          @{taster.tasterId.replace("-", "")}_matguest
        </span>
        <p className="profile-bio">
          {taster.intro ?? "맛있는 하루를 기록하며 맛집을 탐방합니다."}
          <br />
          좋은 맛집이 있으면 언제든 추천해 주세요! <b>♥</b>
        </p>
        {!!taster.profileTags?.length && (
          <div className="profile-taste-tags" aria-label="맛객 취향 태그">
            {taster.profileTags.map((tag) => <span key={tag}>#{tag}</span>)}
          </div>
        )}
        <div className="profile-statistics">
          <span>
            <b>{taster.postCount ?? own.length}</b>게시물
          </span>
          <span>
            <b>{taster.followerCount ?? 0}</b>팔로워
          </span>
          <span>
            <b>{taster.followingCount ?? 0}</b>팔로잉
          </span>
        </div>
        <button
          className={`primary-button ${subscribed ? "is-subscribed" : ""}`}
          onClick={onSubscribe}
          disabled={subscribed}
        >
          {subscribed ? (
            <>
              <Icon name="check" />
              구독 중
            </>
          ) : (
            "구독하기"
          )}
        </button>
        <div className="detail-tabs profile-tabs">
          {["맛집", "태그", "좋아요"].map((item) => (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === "맛집" ? (
          <div className="profile-grid">
            {own.map((place) => (
              <button key={place.id} onClick={() => go("place", place.id)}>
                <FoodPhoto place={place} />
                <span>{place.name}</span>
                <small>
                  <Icon name="heart" />
                  100
                </small>
              </button>
            ))}
          </div>
        ) : tab === "태그" ? (
          <div className="suggested-tags profile-tag-list">
            {(taster.profileTags ?? []).map((tag) => <span key={tag}>#{tag}</span>)}
            {[
              ...new Set(own.map((place) => place.category.split(" · ")[0])),
            ].map((category) => (
              <span key={`place-${category}`}>#{category}</span>
            ))}
            {!taster.profileTags?.length && !own.length && <p>아직 등록된 취향 태그가 없어요.</p>}
          </div>
        ) : (
          <div className="empty-state">
            <Icon name="heart" />
            <p>이 맛객의 좋아요 내역은 아직 공개되지 않았어요.</p>
          </div>
        )}
      </section>
    </main>
  );
}
