import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { Place, Taster } from "../models/place";
import { go } from "../app/navigation";
import { HomeHeader } from "../components/AppChrome";
import { Avatar, CategoryArt, FoodPhoto, ProfileCover } from "../components/BrandAssets";
import Icon from "../components/Icon";
import PlaceTile from "../components/PlaceTile";
import PaginationDots from "../components/PaginationDots";
import { profileCoverFor } from "../utils/profileMedia";
import { distanceMeters, type Coordinates } from "../utils/geo";

type Props = {
  places: Place[];
  loading: boolean;
  error: string;
  liked: string[];
  unread: boolean;
  onLike: (id: string) => void;
  onRetry: () => void;
  photoFor: (id: string) => string | undefined;
  recommendedTasters: Taster[];
  preferenceCount: number;
  onManagePreferences: () => void;
};
const categories = ["전체", "한식", "일식", "중식", "양식", "카페/디저트"];
const bannerSlides = [
  {
    eyebrow: "맛다공에서 오늘의 한 끼 찾기",
    title: "오늘 뭐 먹지?",
    subtitle: "맛객들이 직접 남긴 추천을 둘러보세요",
    action: "지도에서 맛집 둘러보기",
    screen: "map",
    image: null,
  },
  {
    eyebrow: "내 취향에 맞는 맛객 발견",
    title: "나와 입맛이 비슷한 맛객",
    subtitle: "취향이 맞는 맛객의 맛집을 확인해 보세요",
    action: "맛객 추천 보기",
    screen: "taster-recommendations",
    image: "/assets/banner-taster-discovery.png",
  },
  {
    eyebrow: "방금 다녀온 곳도 간편하게",
    title: "맛집 기록을 남겨보세요",
    subtitle: "장소와 추천 이유를 내 기록으로 모아요",
    action: "맛집 등록하기",
    screen: "register",
    image: "/assets/banner-place-journal.png",
  },
] as const;
const categoryArtIndexes: Record<string, number> = {
  한식: 0,
  일식: 1,
  중식: 2,
  양식: 3,
  "카페/디저트": 4,
  전체: 5,
};

// '내 주변'으로 볼 때 현재 위치에서 이 거리 안의 맛집만 보여줍니다.
const NEARBY_RADIUS_METERS = 15_000;

export default function HomeScreen({
  places,
  loading,
  error,
  liked,
  unread,
  onLike,
  onRetry,
  photoFor,
  recommendedTasters,
  preferenceCount,
  onManagePreferences,
}: Props) {
  const [category, setCategory] = useState("전체");
  const [bannerIndex, setBannerIndex] = useState(0);
  const bannerPointerStart = useRef<{ x: number; y: number } | null>(null);
  const skipBannerClick = useRef(false);
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setBannerIndex((current) => (current + 1) % bannerSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  function handleBannerPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (bannerPointerStart.current === null) return;
    const { x, y } = bannerPointerStart.current;
    const distance = event.clientX - x;
    const verticalDistance = Math.abs(event.clientY - y);
    bannerPointerStart.current = null;
    if (Math.abs(distance) < 45 || Math.abs(distance) < verticalDistance * 1.2) return;
    skipBannerClick.current = true;
    setBannerIndex((current) => (current + (distance < 0 ? 1 : bannerSlides.length - 1)) % bannerSlides.length);
    window.setTimeout(() => { skipBannerClick.current = false; }, 0);
  }
  // 홈의 인기 목록에는 광고 상품을 섞지 않고 맛객이 남긴 공개 기록을 보여줍니다.
  let visible = places.filter((place) => !place.advertisement);
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
  if (location) {
    visible = visible.filter((place) => distanceMeters(location, place) <= NEARBY_RADIUS_METERS);
    visible.sort((left, right) =>
      right.recordCount - left.recordCount
      || distanceMeters(location, left) - distanceMeters(location, right),
    );
  } else {
    visible.sort((left, right) => right.recordCount - left.recordCount);
  }

  function toggleLocationScope() {
    if (location) {
      setLocation(null);
      setLocationMessage("");
      return;
    }
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저에서는 위치를 확인할 수 없어요.");
      return;
    }
    setLocationMessage("현재 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationMessage("");
      },
      () => setLocationMessage("위치 권한을 허용하면 15km 안의 맛집을 볼 수 있어요."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }
  return (
    <>
      <HomeHeader unread={unread} />
      <main className="home-content">
        <div className="home-banner-carousel"
          onPointerDown={(event) => { bannerPointerStart.current = { x: event.clientX, y: event.clientY }; }}
          onPointerUp={handleBannerPointerUp}
          onPointerCancel={() => { bannerPointerStart.current = null; }}>
          <div className="home-banner-track" style={{ transform: `translateX(-${bannerIndex * 100}%)` }}>
            {bannerSlides.map((slide, index) => (
              <button className="food-banner" type="button" key={slide.title} onClick={() => {
                if (skipBannerClick.current) { skipBannerClick.current = false; return; }
                go(slide.screen);
              }}>
                {slide.image
                  ? <img className="food-photo" src={slide.image} alt="" />
                  : <FoodPhoto place={places[index % Math.max(places.length, 1)]} />}
                <span className="banner-shade" />
                <span className="banner-eyebrow"><Icon name="sparkle" /> {slide.eyebrow}</span>
                <span className="banner-copy">
                  <b>{slide.title}</b>
                  <strong>{slide.subtitle}</strong>
                  <small>{slide.action} <Icon name="chevron" /></small>
                </span>
                <span className="banner-end"><Icon name="chevron" /></span>
              </button>
            ))}
          </div>
        </div>
        <PaginationDots activeIndex={bannerIndex} total={bannerSlides.length} onSelect={setBannerIndex} className="home-banner-pagination" label="홈 배너" />
        <section className="home-taste-recommendations">
          <div className="home-taste-heading">
            <span className="mascot-buddy"><Avatar name="맛다공" variant={2} /><i><Icon name="sparkle" /></i></span>
            <div className="home-taste-heading-copy">
              <h2>내 취향 맛객</h2>
              <p>{preferenceCount ? "취향이 비슷한 맛객을 찾아봤어요." : "취향을 알려 주면 더 잘 맞는 맛객을 찾아드려요."}</p>
            </div>
          </div>
          {preferenceCount > 0 && recommendedTasters.length ? (
            <div className="home-taster-list">
              {recommendedTasters.slice(0, 5).map((taster) => {
                const matchedTags = taster.matchedTags ?? [];
                const cardTags = matchedTags.length
                  ? matchedTags
                  : taster.profileTags ?? taster.tag.split(" · ").filter(Boolean);
                const visibleTags = cardTags.slice(0, 2);
                const hiddenTagCount = Math.max(0, cardTags.length - visibleTags.length);
                return (
                  <button className="home-taster-card" key={taster.tasterId} onClick={() => go("profile", taster.tasterId)}>
                    <span className="home-taster-cover">
                      <ProfileCover className="home-taster-cover-photo" src={profileCoverFor(taster.tasterId, taster.profileCoverUrls?.[0] ?? taster.profileCoverUrl)} />
                      <i><Avatar src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} /></i>
                    </span>
                    <span className="home-taster-card-copy">
                      <b>{taster.tasterName}</b>
                      <small>
                        {visibleTags.length ? visibleTags.map((tag) => <span key={tag}>{`#${tag}`}</span>) : <span>#취향이 비슷해요</span>}
                        {hiddenTagCount > 0 && <em>+{hiddenTagCount}</em>}
                      </small>
                    </span>
                    <Icon name="chevron" />
                  </button>
                );
              })}
            </div>
          ) : preferenceCount === 0 ? (
            <button className="home-taster-empty home-taster-empty-action" type="button" onClick={onManagePreferences}>
              <span>내가 고른 취향을 바탕으로 잘 맞는 맛객을 찾아드려요.</span>
              <b>취향 설정하기 <Icon name="chevron" /></b>
            </button>
          ) : <p className="home-taster-empty">아직 취향이 비슷한 맛객이 없어요. 취향 설정을 바꾸면 추천이 달라질 수 있어요.</p>}
        </section>
        <div className="food-categories" aria-label="음식 종류">
          {categories.map((name, index) => (
            <button
              key={name}
              aria-pressed={category === name}
              className={category === name ? "active" : ""}
              onClick={() => setCategory(name)}
            >
              <CategoryArt index={categoryArtIndexes[name] ?? index} />
              <span>{name}</span>
            </button>
          ))}
        </div>
        <section className="recommendations">
          <div className="recommendations-heading">
            <div>
              <h2>맛객들이 많이 기록한 맛집</h2>
              <small>{location ? "현재 위치 15km 안 · 맛객 기록 많은 순" : "전체 지역 · 맛객 기록 많은 순"}</small>
            </div>
            <button className={`home-scope-button ${location ? "active" : ""}`} type="button" onClick={toggleLocationScope} aria-pressed={!!location}>
              <Icon name={location ? "locate" : "map"} />{location ? "내 주변 15km" : "전체 지역"}
            </button>
          </div>
          {locationMessage && <small className="home-location-message" role="status">{locationMessage}</small>}
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
                  liked={liked.includes(place.id)}
                  onLike={() => onLike(place.id)}
                  photo={photoFor(place.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Icon name="pin" />
              <p>{location ? "현재 위치 15km 안에 등록된 맛집이 아직 없어요." : "맛객의 맛집 기록이 아직 없어요."}</p>
              <button
                className="outline-button"
                onClick={() => {
                  setCategory("전체");
                  if (location) setLocation(null);
                }}
              >
                전체 지역 보기
              </button>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
