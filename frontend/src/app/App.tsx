import { useEffect, useState } from "react";
import type { NewPlace, Place, Taster } from "../models/place";
import { getPlaces, getPlace } from "../services/places";
import { useActivity } from "../services/activity";
import { go, useRoute } from "./navigation";
import { BottomTabs, ScreenHeader } from "../components/AppChrome";
import Icon from "../components/Icon";
import HomeScreen from "../screens/HomeScreen";
import MapScreen from "../screens/MapScreen";
import RegisterScreen from "../screens/RegisterScreen";
import PlaceScreen from "../screens/PlaceScreen";
import ProfileScreen from "../screens/ProfileScreen";
import MyScreen from "../screens/MyScreen";
import {
  CollectionScreen,
  NotificationsScreen,
  SubscriptionsScreen,
} from "../screens/CollectionScreen";
import SettingsScreen from "../screens/SettingsScreen";
import IntroScreen, { LoginScreen } from "../screens/IntroScreen";

function registeredPlace(item: NewPlace): Place {
  return {
    id: item.id,
    name: item.name,
    category: item.tags[0] ?? "맛객 추천",
    address: item.address,
    latitude: item.latitude,
    longitude: item.longitude,
    emoji: "",
    accentColor: "#FFE5D5",
    visitedOn: item.createdAt.slice(0, 10),
    recentNote: item.reason,
    recordCount: 1,
    tasters: [
      {
        tasterId: "me",
        tasterName: "맛다공이",
        tag: "내가 발견한 맛집",
        avatar: "",
        avatarColor: "",
        note: item.reason,
      },
    ],
  };
}

export default function App() {
  const route = useRoute();
  const activity = useActivity();
  const [places, setPlaces] = useState<Place[]>([]);
  const [detail, setDetail] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [toast, setToast] = useState("");

  useEffect(() => {
    // 지도 검색 입력은 짧게 모아서 보내고, 화면 이동이나 새 검색이 오면 이전 요청을 취소합니다.
    const controller = new AbortController();
    setLoading(true);
    const timeout = window.setTimeout(
      () => {
        getPlaces(query.trim(), controller.signal)
          .then((result) => {
            setPlaces(result);
            setError("");
          })
          .catch((cause: Error) => {
            if (!controller.signal.aborted) setError(cause.message);
          })
          .finally(() => {
            if (!controller.signal.aborted) setLoading(false);
          });
      },
      query ? 250 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, retry]);

  useEffect(() => {
    if (route.screen !== "map") setQuery("");
  }, [route.screen]);
  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);
  useEffect(() => {
    let active = true;
    if (
      route.screen === "place" &&
      route.id &&
      !route.id.startsWith("local-")
    ) {
      getPlace(route.id)
        .then((place) => {
          if (active) setDetail(place);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [route.screen, route.id]);

  const registered = activity.registered
    .map(registeredPlace)
    .filter(
      (place) =>
        !query ||
        `${place.name} ${place.address} ${place.category}`.includes(query),
    );
  const allPlaces = [...registered, ...places];
  const activePlace =
    detail?.id === route.id
      ? detail
      : allPlaces.find((place) => place.id === route.id);
  const tasters: Taster[] = [
    ...new Map(
      allPlaces
        .flatMap((place) => place.tasters)
        .map((taster) => [taster.tasterId, taster]),
    ).values(),
  ];
  const activeTaster = tasters.find((taster) => taster.tasterId === route.id);
  const own = activity.registered.find((place) => place.id === route.id);

  useEffect(() => {
    if (route.screen === "place" && activePlace) activity.remember(route.id);
    if (route.screen === "notifications") activity.readAlertsNow();
    // 방문 기록은 화면 진입 시 한 번만 갱신합니다.
  }, [route.screen, route.id, !!activePlace]);

  function toggleSave(id: string) {
    activity.toggle("saved", id);
    setToast(
      activity.saved.includes(id)
        ? "스크랩을 취소했어요."
        : "내 맛집에 스크랩했어요.",
    );
  }
  function register(place: NewPlace) {
    activity.register(place);
    go("place", place.id);
    setToast("맛집을 등록했어요.");
  }
  function photoFor(id: string) {
    return activity.registered.find((place) => place.id === id)?.photos[0];
  }
  const bottomVisible = ![
    "place",
    "profile",
    "register",
    "intro",
    "login",
  ].includes(route.screen);
  let screen;

  if (route.screen === "home")
    screen = (
      <HomeScreen
        places={allPlaces}
        loading={loading}
        error={error}
        subscriptions={activity.subscriptions}
        saved={activity.saved}
        unread={!activity.readAlerts}
        onSave={toggleSave}
        onRetry={() => setRetry(retry + 1)}
        photoFor={photoFor}
      />
    );
  else if (route.screen === "map")
    screen = (
      <MapScreen
        places={allPlaces}
        subscriptions={activity.subscriptions}
        query={query}
        onQuery={setQuery}
        loading={loading}
        error={error}
      />
    );
  else if (route.screen === "register")
    screen = <RegisterScreen places={allPlaces} onRegister={register} />;
  else if (route.screen === "place")
    screen = activePlace ? (
      <PlaceScreen
        key={activePlace.id}
        place={activePlace}
        own={own}
        saved={activity.saved.includes(activePlace.id)}
        liked={activity.liked.includes(activePlace.id)}
        onSave={() => toggleSave(activePlace.id)}
        onLike={() => activity.toggle("liked", activePlace.id)}
        onMessage={setToast}
      />
    ) : (
      <>
        <ScreenHeader title="맛집 상세" />
        <div className="empty-state">
          <p>
            {loading
              ? "맛집을 불러오고 있어요…"
              : "맛집 정보를 찾을 수 없어요."}
          </p>
          <button className="outline-button" onClick={() => go("home")}>
            홈으로 돌아가기
          </button>
        </div>
      </>
    );
  else if (route.screen === "profile")
    screen = activeTaster ? (
      <ProfileScreen
        key={activeTaster.tasterId}
        taster={activeTaster}
        places={allPlaces}
        subscribed={activity.subscriptions.includes(activeTaster.tasterId)}
        onSubscribe={() =>
          activity.toggle("subscriptions", activeTaster.tasterId)
        }
      />
    ) : (
      <>
        <ScreenHeader title="맛객 프로필" />
        <div className="empty-state">
          <p>맛객 정보를 찾을 수 없어요.</p>
          <button className="outline-button" onClick={() => go("home")}>
            홈으로 돌아가기
          </button>
        </div>
      </>
    );
  else if (route.screen === "my")
    screen = (
      <MyScreen
        savedCount={activity.saved.length}
        likedCount={activity.liked.length}
        registeredCount={activity.registered.length}
        recentCount={activity.recent.length}
        subscribedCount={activity.subscriptions.length}
      />
    );
  else if (route.screen === "notifications")
    screen = <NotificationsScreen registrations={activity.registered} />;
  else if (route.screen === "subscriptions")
    screen = (
      <SubscriptionsScreen
        tasters={tasters}
        subscriptions={activity.subscriptions}
        onSubscribe={(id) => activity.toggle("subscriptions", id)}
      />
    );
  else if (route.screen === "settings") screen = <SettingsScreen />;
  else if (route.screen === "intro") screen = <IntroScreen />;
  else if (route.screen === "login")
    screen = <LoginScreen onMessage={setToast} />;
  else {
    const titles = {
      saved: "내 스크랩",
      diary: "내가 등록한 맛집",
      liked: "좋아요한 맛집",
      recent: "최근 본 맛집",
      reviews: "내 리뷰",
    };
    const ids =
      route.screen === "saved"
        ? activity.saved
        : route.screen === "diary"
          ? activity.registered.map((place) => place.id)
          : route.screen === "liked"
            ? activity.liked
            : route.screen === "recent"
              ? activity.recent
              : [];
    screen = (
      <CollectionScreen
        title={titles[route.screen as keyof typeof titles] ?? "나의 기록"}
        places={ids
          .map((id) => allPlaces.find((place) => place.id === id))
          .filter((place): place is Place => !!place)}
        saved={activity.saved}
        onSave={toggleSave}
        photoFor={photoFor}
      />
    );
  }
  return (
    <div className={`app-view ${bottomVisible ? "with-tabs" : ""}`}>
      <div className="screen-content" key={route.screen}>
        {screen}
      </div>
      {bottomVisible && (
        <BottomTabs
          screen={
            ["home", "map", "notifications"].includes(route.screen)
              ? route.screen
              : "my"
          }
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <Icon name="check" />
          {toast}
        </div>
      )}
      {activity.storageError && (
        <div className="storage-error" role="alert">
          {activity.storageError}
        </div>
      )}
    </div>
  );
}
