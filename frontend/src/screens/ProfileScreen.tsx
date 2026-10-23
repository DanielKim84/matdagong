import { useState } from "react";
import type { Place, Taster } from "../models/place";
import { go } from "../app/navigation";
import { BrandArt, FoodPhoto } from "../components/BrandAssets";
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
        <img src="/assets/profile-cover.png" alt="맛객 프로필 커버" />
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
        <BrandArt
          className="profile-pin"
          name={subscribed ? "purplePin" : "redPin"}
        />
        <h1>{taster.tasterName}</h1>
        <span className="profile-handle">
          @{taster.tasterId.replace("-", "")}_matguest
        </span>
        <p className="profile-bio">
          맛있는 하루를 기록하며 맛집 탐방합니다.
          <br />
          좋은 맛집이 있으면 언제든 추천해 주세요! <b>♥</b>
        </p>
        <div className="profile-statistics">
          <span>
            <b>{own.length}</b>게시물
          </span>
          <span>
            <b>{subscribed ? "3,453" : "3,452"}</b>팔로워
          </span>
          <span>
            <b>280</b>팔로잉
          </span>
        </div>
        <button
          className={`primary-button ${subscribed ? "is-subscribed" : ""}`}
          onClick={onSubscribe}
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
            <span>#{taster.tag.replaceAll(" ", "")}</span>
            {[
              ...new Set(own.map((place) => place.category.split(" · ")[0])),
            ].map((category) => (
              <span key={category}>#{category}</span>
            ))}
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
