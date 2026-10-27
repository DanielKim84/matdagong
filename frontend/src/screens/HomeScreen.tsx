import { useState } from "react";
import type { Place, Taster } from "../models/place";
import { go } from "../app/navigation";
import { HomeHeader, FeedTabs } from "../components/AppChrome";
import { Avatar, CategoryArt, FoodPhoto } from "../components/BrandAssets";
import Icon from "../components/Icon";
import PlaceTile from "../components/PlaceTile";

type Props = {
  places: Place[];
  loading: boolean;
  error: string;
  subscriptions: string[];
  saved: string[];
  unread: boolean;
  recommendedTasters: Taster[];
  preferenceCount: number;
  onManagePreferences: () => void;
  onSave: (id: string) => void;
  onRetry: () => void;
  photoFor: (id: string) => string | undefined;
};
const categories = ["한식", "일식", "중식", "양식", "카페/디저트", "전체"];

export default function HomeScreen({
  places,
  loading,
  error,
  subscriptions,
  saved,
  unread,
  recommendedTasters,
  preferenceCount,
  onManagePreferences,
  onSave,
  onRetry,
  photoFor,
}: Props) {
  const [feed, setFeed] = useState("추천");
  const [category, setCategory] = useState("전체");
  let visible =
    feed === "구독"
      ? places.filter((place) =>
          place.tasters.some((taster) =>
            subscriptions.includes(taster.tasterId),
          ),
        )
      : feed === "광고 맛집"
        ? []
        : places;
  if (category !== "전체")
    visible = visible.filter((place) =>
      category === "카페/디저트"
        ? /카페|간식|베이커리/.test(place.category)
        : category === "양식"
          ? /델리|샌드위치|양식/.test(place.category)
          : category === "일식"
            ? /우동|일식/.test(place.category)
            : place.category.includes(category),
    );
  return (
    <>
      <HomeHeader unread={unread} />
      <FeedTabs value={feed} onChange={setFeed} />
      <main className="home-content">
        <button className="food-banner" onClick={() => go("map")}>
          <FoodPhoto index={0} />
          <span className="banner-shade" />
          <span className="banner-plus">
            <Icon name="plus" />
          </span>
          <span className="banner-copy">
            <b>오늘 뭐 먹지?</b>
            <strong>맛있는 이야기가 여기에 있어요!</strong>
            <small>
              <Icon name="pin" />
              서울 마포구
            </small>
          </span>
          <span className="banner-end">
            <Icon name="plus" />
          </span>
        </button>
        <div className="food-categories" aria-label="음식 종류">
          {categories.map((name, index) => (
            <button
              key={name}
              aria-pressed={category === name}
              className={category === name ? "active" : ""}
              onClick={() => setCategory(name)}
            >
              <CategoryArt index={index} />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <section className="taste-recommendations">
          <div className="taste-recommendations-heading">
            <div>
              <h2>취향이 잘 맞는 맛객</h2>
              <p>내가 고른 취향과 맛객 태그를 비교해 추천해요.</p>
            </div>
            <button type="button" onClick={onManagePreferences}>취향 수정</button>
          </div>
          {recommendedTasters.length ? (
            <div className="taste-recommendation-list">
              {recommendedTasters.map((taster) => (
                <button
                  type="button"
                  className="taste-recommendation-card"
                  key={taster.tasterId}
                  onClick={() => go("profile", taster.tasterId)}
                >
                  <Avatar src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
                  <span className="taste-recommendation-copy">
                    <b>{taster.tasterName}</b>
                    <small>취향 {taster.matchScore}개가 같아요</small>
                    <span>{(taster.matchedTags ?? []).slice(0, 3).map((tag) => `#${tag}`).join(" ")}</span>
                  </span>
                  <Icon name="chevron" />
                </button>
              ))}
            </div>
          ) : (
            <div className="taste-recommendation-empty">
              <span>{preferenceCount === 0
                ? "선호 태그를 고르면 취향이 비슷한 맛객을 먼저 찾아드려요."
                : "내 취향 태그를 등록한 맛객이 늘어나면 여기서 추천해드릴게요."}</span>
              <button type="button" onClick={onManagePreferences}>
                {preferenceCount === 0 ? "내 취향 고르기" : "취향 태그 확인"}
              </button>
            </div>
          )}
        </section>
        <section className="recommendations">
          <h2>
            {feed === "구독"
              ? "구독한 맛객의 맛집"
              : feed === "광고 맛집"
                ? "다양한 광고 맛집"
                : "지금 핫한 맛집"}
          </h2>
          {loading ? (
            <div className="tile-grid">
              {[1, 2].map((n) => (
                <div className="tile-skeleton" key={n} />
              ))}
            </div>
          ) : error ? (
            <div className="empty-state">
              <p>{error}</p>
              <button className="outline-button" onClick={onRetry}>
                다시 불러오기
              </button>
            </div>
          ) : visible.length ? (
            <div className="tile-grid">
              {visible.map((place) => (
                <PlaceTile
                  key={place.id}
                  place={place}
                  saved={saved.includes(place.id)}
                  onSave={() => onSave(place.id)}
                  photo={photoFor(place.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Icon name={feed === "광고 맛집" ? "fork" : "pin"} />
              <p>
                {feed === "광고 맛집"
                  ? "아직 등록된 광고 맛집이 없어요."
                  : "선택한 맛집의 기록이 아직 없어요."}
              </p>
              <button
                className="outline-button"
                onClick={() => {
                  setFeed("추천");
                  setCategory("전체");
                }}
              >
                추천 맛집 보기
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
