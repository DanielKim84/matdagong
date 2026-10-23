import { useState } from "react";
import type { NewPlace, Place } from "../models/place";
import { go } from "../app/navigation";
import { FoodPhoto, Avatar } from "../components/BrandAssets";
import { Rating } from "../components/PlaceTile";
import Icon from "../components/Icon";

type Props = {
  place: Place;
  own?: NewPlace;
  saved: boolean;
  liked: boolean;
  onSave: () => void;
  onLike: () => void;
  onMessage: (message: string) => void;
};
export default function PlaceScreen({
  place,
  own,
  saved,
  liked,
  onSave,
  onLike,
  onMessage,
}: Props) {
  const [tab, setTab] = useState("소개");
  const tabs = ["소개", "메뉴", "사진", "태그", "위치정보"];
  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      onMessage("맛집 링크를 복사했어요.");
    } catch {
      onMessage("주소창의 링크를 복사해 공유해 주세요.");
    }
  }
  return (
    <main className="place-screen">
      <div className="place-hero">
        {own?.photos[0] ? (
          <img src={own.photos[0]} alt={place.name} />
        ) : (
          <FoodPhoto place={place} />
        )}
        <button
          className="photo-back icon-button"
          onClick={() => go("map")}
          aria-label="지도로 돌아가기"
        >
          <Icon name="back" />
        </button>
        <div className="hero-photo-actions">
          <button aria-label="맛집 스크랩" onClick={onSave}>
            <Icon name="bookmark" filled={saved} />
          </button>
          <button aria-label="사진 보기" onClick={() => setTab("사진")}>
            <Icon name="image" />
          </button>
        </div>
        <span className="photo-count">
          <Icon name="image" />
          1/{own?.photos.length || 1}
        </span>
      </div>
      <section className="place-info">
        <div className="place-heading">
          <h1>{place.name}</h1>
          <div>
            <button
              className={liked ? "red" : ""}
              onClick={onLike}
              aria-label="맛집 좋아요"
              aria-pressed={liked}
            >
              <Icon name="heart" filled={liked} />
            </button>
            <button
              className={saved ? "red" : ""}
              onClick={onSave}
              aria-label="맛집 저장"
              aria-pressed={saved}
            >
              <Icon name="bookmark" filled={saved} />
            </button>
            <button onClick={share} aria-label="맛집 공유">
              <Icon name="share" />
            </button>
          </div>
        </div>
        <Rating count={place.recordCount} />
        <div className="place-tags">
          {(own?.tags.length
            ? own.tags
            : [place.category.split(" · ")[0], "맛객 추천", "동네 맛집"]
          ).map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <p className="place-line">
          <Icon name="pin" />
          {place.address}
          <small>0.3km</small>
        </p>
        <p className="place-line opening">
          <Icon name="clock" />
          <b>영업 정보</b>
          <span>영업시간 등록 전</span>
        </p>
        <div className="place-action-buttons">
          <button onClick={() => go("map")}>
            <Icon name="pin" />
            지도보기
          </button>
          <a
            href={`https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="route" />
            길찾기
          </a>
        </div>
        <div className="detail-tabs" role="tablist">
          {tabs.map((item) => (
            <button
              key={item}
              role="tab"
              aria-selected={tab === item}
              className={tab === item ? "active" : ""}
              onClick={() => setTab(item)}
            >
              {item}
            </button>
          ))}
        </div>
        {tab === "소개" && (
          <>
            <section className="detail-section">
              <h2>추천 이유</h2>
              <p>{own?.reason ?? place.recentNote}</p>
            </section>
            <section className="detail-section">
              <h2>이 맛집을 추천한 맛객</h2>
              <div className="place-tasters">
                {place.tasters.map((taster) => (
                  <button
                    key={taster.tasterId}
                    onClick={() => go("profile", taster.tasterId)}
                  >
                    <Avatar />
                    <span>
                      <b>{taster.tasterName}</b>
                      <small>{taster.tag}</small>
                    </span>
                    <Icon name="chevron" />
                  </button>
                ))}
              </div>
            </section>
            <div className="place-photo-grid">
              {[0, 1, 2].map((index) => (
                <FoodPhoto index={index} key={index} />
              ))}
            </div>
          </>
        )}
        {tab === "메뉴" && (
          <section className="detail-section">
            <h2>대표 메뉴</h2>
            {own?.menus.length ? (
              <ul className="menu-list">
                {own.menus.map((menu) => (
                  <li key={menu}>{menu}</li>
                ))}
              </ul>
            ) : (
              <p>아직 등록된 메뉴가 없어요.</p>
            )}
          </section>
        )}
        {tab === "사진" && (
          <section className="detail-section">
            <h2>맛집 사진</h2>
            <div className="place-photo-grid">
              {own?.photos.length ? (
                own.photos.map((photo, index) => (
                  <img
                    src={photo}
                    alt={`맛집 사진 ${index + 1}`}
                    key={photo.slice(-30)}
                  />
                ))
              ) : (
                <FoodPhoto place={place} />
              )}
            </div>
            {!own && (
              <small className="muted-caption">
                화면 확인을 위한 음식 예시 사진이에요.
              </small>
            )}
          </section>
        )}
        {tab === "태그" && (
          <section className="detail-section">
            <h2>이 맛집의 태그</h2>
            <div className="suggested-tags">
              {(own?.tags.length
                ? own.tags
                : [place.category.split(" · ")[0], "맛객 추천"]
              ).map((tag) => (
                <span key={tag}>#{tag}</span>
              ))}
            </div>
          </section>
        )}
        {tab === "위치정보" && (
          <section className="detail-section">
            <h2>위치 정보</h2>
            <p>{place.address}</p>
            <small className="muted-caption">
              위도 {place.latitude.toFixed(5)} · 경도{" "}
              {place.longitude.toFixed(5)}
            </small>
            <button className="outline-button" onClick={() => go("map")}>
              지도에서 보기
            </button>
          </section>
        )}
      </section>
    </main>
  );
}
