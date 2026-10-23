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
  subscriptions,
  onSubscribe,
}: {
  tasters: Taster[];
  subscriptions: string[];
  onSubscribe: (id: string) => void;
}) {
  return (
    <>
      <ScreenHeader title="내 구독 맛객" />
      <main className="subscription-list">
        <p>마음에 드는 맛객을 구독해 보세요.</p>
        {tasters.map((taster) => (
          <article key={taster.tasterId}>
            <button
              className="subscription-profile"
              onClick={() => go("profile", taster.tasterId)}
            >
              <Avatar />
              <span>
                <b>{taster.tasterName}</b>
                <small>{taster.tag}</small>
              </span>
            </button>
            <button
              className={
                subscriptions.includes(taster.tasterId)
                  ? "subscribed-chip"
                  : "subscribe-chip"
              }
              onClick={() => onSubscribe(taster.tasterId)}
            >
              {subscriptions.includes(taster.tasterId) ? "구독 중" : "구독하기"}
            </button>
          </article>
        ))}
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
          <Avatar />
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
