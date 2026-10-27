import type { Place, Taster } from "../models/place";
import { go } from "../app/navigation";
import { ScreenHeader } from "../components/AppChrome";
import { Avatar } from "../components/BrandAssets";
import PlaceTile from "../components/PlaceTile";
import Icon from "../components/Icon";

export function CollectionScreen({
  title,
  places,
  saved,
  onSave,
  photoFor,
}: {
  title: string;
  places: Place[];
  saved: string[];
  onSave: (id: string) => void;
  photoFor: (id: string) => string | undefined;
}) {
  return (
    <>
      <ScreenHeader title={title} />
      <main className="collection-content">
        {places.length ? (
          <div className="tile-grid">
            {places.map((place) => (
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
          <div className="empty-state collection-empty">
            <Icon name="book" />
            <h2>차곡차곡, 나의 맛집 기록</h2>
            <p>아직 모아둔 기록이 없어요.</p>
            <button
              className="primary-button"
              onClick={() =>
                go(title === "내가 등록한 맛집" ? "register" : "home")
              }
            >
              {title === "내가 등록한 맛집"
                ? "첫 맛집 등록하기"
                : "맛집 둘러보기"}
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export function SubscriptionsScreen({
  tasters,
}: {
  tasters: Taster[];
}) {
  return (
    <>
      <ScreenHeader title="내 구독 맛객" />
      <main className="subscription-list">
        {tasters.length ? (
          <>
            <p>현재 구독 중인 맛객이에요.</p>
            {tasters.map((taster) => (
              <article key={taster.tasterId}>
                <button
                  className="subscription-profile"
                  onClick={() => go("profile", taster.tasterId)}
                >
                  <Avatar src={taster.avatar} name={taster.tasterName} variant={taster.avatarVariant} />
                  <span>
                    <b>{taster.tasterName}</b>
                    <small>{taster.tag}</small>
                  </span>
                </button>
                <span className="subscribed-chip">구독 중</span>
              </article>
            ))}
          </>
        ) : (
          <div className="empty-state collection-empty">
            <Icon name="pin" />
            <h2>아직 구독한 맛객이 없어요</h2>
            <p>추천 맛집에서 취향이 맞는 맛객을 찾아보세요.</p>
            <button className="primary-button" onClick={() => go("home")}>
              맛집 둘러보기
            </button>
          </div>
        )}
      </main>
    </>
  );
}

export function NotificationsScreen({
  registrations,
}: {
  registrations: { id: string; name: string; createdAt: string }[];
}) {
  return (
    <>
      <ScreenHeader title="알림" />
      <main className="notification-list">
        {registrations.map((place) => (
          <button key={place.id} onClick={() => go("place", place.id)}>
            <span className="red-menu-icon">
              <Icon name="fork" />
            </span>
            <span>
              <b>맛집 등록이 완료됐어요.</b>
              <p>{place.name}의 맛있는 이야기를 확인해 보세요.</p>
              <small>
                {new Date(place.createdAt).toLocaleDateString("ko-KR")}
              </small>
            </span>
            <Icon name="chevron" />
          </button>
        ))}
        <button onClick={() => go("subscriptions")}>
          <Avatar name="맛다공" />
          <span>
            <b>맛다공에 오신 걸 환영해요!</b>
            <p>취향이 닮은 맛객을 구독하고 맛집을 발견해 보세요.</p>
            <small>맛다공의 첫 인사</small>
          </span>
        </button>
      </main>
    </>
  );
}
