import { useCallback, useEffect, useState } from "react";
import type { NewPlace, Place, Taster } from "../models/place";
import { getPlaces, getPlace } from "../services/places";
import { useActivity } from "../services/activity";
import { go, useRoute } from "./navigation";
import { BottomTabs, ScreenHeader } from "../components/AppChrome";
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
import ProfileSettingsScreen from "../screens/ProfileSettingsScreen";
import IntroScreen from "../screens/IntroScreen";
import RecommendedTastersScreen from "../screens/RecommendedTastersScreen";
import NoticeToast, { type NoticeKind } from "../components/NoticeToast";
import SubscriptionOfferSheet from "../screens/SubscriptionOfferSheet";
import {
  ensureMyProfile,
  getSubscriptions,
  getIncomingSubscriptions,
  getPoints,
  getTasteTags,
  getTasters,
  type ActiveSubscription,
  type IncomingSubscription,
  type PointAccount,
  type MyProfile,
  type TasteTag,
  uploadProfileImage,
  uploadProfileCover,
  removeProfileImage,
  updateMyProfile,
  createTagRequest,
  getMyTagRequests,
  type TagRequestInput,
} from "../services/community";

type Props = { accessToken: string; displayName: string; onLogout: () => void };
type Notice = { kind: NoticeKind; title: string; message: string };

function registeredPlace(item: NewPlace): Place {
  return {
    id: item.id,
    providerPlaceId: item.providerPlaceId,
    providerPhone: item.providerPhone,
    providerUrl: item.providerUrl,
    visibility: item.visibility,
    name: item.name,
    category: item.category ?? item.tags[0] ?? "맛객 추천",
    address: item.address,
    latitude: item.latitude,
    longitude: item.longitude,
    recentNote: item.reason,
    recordCount: 1,
    visitConditions: item.visitConditions,
    tasters: [
      {
        tasterId: "me",
        tasterName: "맛다공이",
        tag: "내가 발견한 맛집",
        avatar: "",
        avatarVariant: 1,
        note: item.reason,
        menus: item.menus,
        photos: item.photos,
        tags: item.tags,
        visitConditions: item.visitConditions,
      },
    ],
  };
}

export default function App({ accessToken, displayName, onLogout }: Props) {
  const requestTag = useCallback((input: TagRequestInput) => createTagRequest(accessToken, input), [accessToken]);
  const loadTagRequests = useCallback(() => getMyTagRequests(accessToken), [accessToken]);
  const route = useRoute();
  const activity = useActivity();
  const [communityTasters, setCommunityTasters] = useState<Taster[]>([]);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [tasteTags, setTasteTags] = useState<TasteTag[]>([]);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
  const [incomingSubscriptions, setIncomingSubscriptions] = useState<IncomingSubscription[]>([]);
  const [points, setPoints] = useState<PointAccount>({ balance: 0, history: [] });
  const [subscriptionTarget, setSubscriptionTarget] = useState<Taster | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [detail, setDetail] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const refreshCommunity = useCallback(async () => {
    const profile = await ensureMyProfile(accessToken, displayName);
    // 부가 API 하나가 새 버전으로 아직 배포되지 않았어도 맛객과 태그 로드는 계속합니다.
    const results = await Promise.allSettled([
      getTasters(accessToken),
      getSubscriptions(accessToken),
      getTasteTags(accessToken),
      getIncomingSubscriptions(accessToken),
      getPoints(accessToken),
    ]);
    const [tastersResult, subscriptionsResult, tasteTagsResult, incomingResult, pointsResult] = results;
    if (tastersResult.status === "rejected") throw tastersResult.reason;
    setMyProfile(profile);
    setCommunityTasters(tastersResult.value);
    setSubscriptions(subscriptionsResult.status === "fulfilled" ? subscriptionsResult.value : []);
    setTasteTags(tasteTagsResult.status === "fulfilled" ? tasteTagsResult.value : []);
    setIncomingSubscriptions(incomingResult.status === "fulfilled" ? incomingResult.value : []);
    setPoints(pointsResult.status === "fulfilled" ? pointsResult.value : { balance: 0, history: [] });
    const unavailable = results.find((result) => result.status === "rejected");
    if (unavailable?.status === "rejected") {
      setNotice({ kind: "error", title: "일부 정보를 불러오지 못했어요", message: unavailable.reason instanceof Error ? unavailable.reason.message : "잠시 후 다시 시도해 주세요." });
    }
  }, [accessToken, displayName]);

  useEffect(() => {
    refreshCommunity().catch((cause: Error) =>
      setNotice({
        kind: "error",
        title: "서비스 정보를 불러오지 못했어요",
        message: cause.message,
      }),
    );
  }, [refreshCommunity]);

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
    // 비공개 기록은 내 기록함에만 두고 홈 추천과 지도 공유 목록에서는 제외합니다.
    .filter((place) => place.visibility !== "private")
    .map(registeredPlace)
    .filter(
      (place) =>
        !query ||
        `${place.name} ${place.address} ${place.category}`.includes(query),
    );
  const privateRecords = activity.registered
    .filter((place) => place.visibility === "private")
    .filter((place) =>
      !query || `${place.name} ${place.address}`.includes(query),
    )
    .map(registeredPlace);
  // Place records may contain older sample names, so use the community profile
  // as the single source for the displayed avatar and profile cover.
  const excludedConditions = new Set(myProfile?.excludedTags ?? []);
  const allPlaces = [...registered, ...places]
    .filter((place) =>
      !(place.visitConditions ?? []).some((condition) => excludedConditions.has(condition)),
    )
    .map((place) => ({
    ...place,
    tasters: place.tasters.map((author) => {
      if (author.tasterId === "me") {
        return {
          ...author,
          tasterName: myProfile?.nickname ?? displayName,
          avatar: myProfile?.profileImgUrl ?? "",
        };
      }
      const profile = communityTasters.find(
        (taster) => taster.tasterId === author.tasterId,
      );
      // 계정 프로필은 최신 이름과 사진을 공급하고, 추천 이유와 메뉴는 장소 기록 값을 보존합니다.
      return profile
        ? {
            ...author,
            ...profile,
            tag: author.tag,
            note: author.note,
            menus: author.menus,
            photos: author.photos,
            tags: author.tags,
            visitConditions: author.visitConditions,
          }
        : author;
    }),
    }));
  const own = activity.registered.find((place) => place.id === route.id);
  const activePlace = detail?.id === route.id
    ? {
        ...detail,
        tasters: detail.tasters.map((author) => {
          const profile = communityTasters.find(
            (taster) => taster.tasterId === author.tasterId,
          );
          return profile
            ? {
                ...author,
                ...profile,
                tag: author.tag,
                note: author.note,
                menus: author.menus,
                photos: author.photos,
                tags: author.tags,
                visitConditions: author.visitConditions,
              }
            : author;
        }),
      }
    : allPlaces.find((place) => place.id === route.id) ?? (own ? registeredPlace(own) : undefined);
  const tasterById = new Map(
    allPlaces.flatMap((place) => place.tasters).map((taster) => [taster.tasterId, taster]),
  );
  // DB 프로필을 마지막에 덮어써 샘플 작성자보다 최신 프로필 사진을 우선합니다.
  communityTasters.forEach((taster) => tasterById.set(taster.tasterId, taster));
  const tasters: Taster[] = [...tasterById.values()];
  const activeTaster = tasters.find((taster) => taster.tasterId === route.id);
  const subscriptionIds = subscriptions.map((subscription) => subscription.targetAccountId);
  const recommendedTasters = communityTasters
    .filter((taster) =>
      (taster.matchScore ?? 0) > 0 && !subscriptionIds.includes(taster.tasterId),
    )
    .sort((left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0));
  const currentFreeSubscription = subscriptions.find(
    (subscription) => subscription.subscriptionType === "FREE",
  );

  useEffect(() => {
    if (route.screen === "place" && activePlace) activity.remember(route.id);
    if (route.screen === "notifications") activity.readAlertsNow();
    // 방문 기록은 화면 진입 시 한 번만 갱신합니다.
  }, [route.screen, route.id, !!activePlace]);

  function toggleLike(id: string) {
    const wasLiked = activity.liked.includes(id);
    activity.toggleLiked(id);
    setNotice({
      kind: "success",
      title: wasLiked ? "내 맛집에서 삭제했어요" : "내 맛집에 추가했어요",
      message: wasLiked ? "저장해 둔 맛집에서 제외했어요." : "내 맛집에서 다시 볼 수 있어요.",
    });
  }
  function register(place: NewPlace) {
    activity.register(place);
    go("place", place.id);
    setNotice({
      kind: "success",
      title: "맛집을 등록했어요",
      message: "새로 등록한 맛집을 바로 확인해 보세요.",
    });
  }
  function photoFor(id: string) {
    return activity.registered.find((place) => place.id === id)?.photos[0];
  }
  function openSubscription(tasterId: string) {
    // 화면에 보이는 맛객은 장소 기록과 커뮤니티 API 응답을 합친 목록에서 찾습니다.
    // API 응답보다 장소 목록이 먼저 도착해도 유효한 샘플 계정의 구독을 막지 않습니다.
    const target = tasters.find((taster) => taster.tasterId === tasterId);
    if (!target) {
      setNotice({
        kind: "info",
        title: "맛객 정보를 확인할 수 없어요",
        message: "잠시 후 다시 시도해 주세요.",
      });
      return;
    }
    if (subscriptionIds.includes(tasterId)) return;
    setSubscriptionTarget(target);
  }
  const bottomVisible = ![
    "place",
    "profile",
    "register",
    "intro",
    "profile-edit",
  ].includes(route.screen);
  let screen;

  if (route.screen === "home")
    screen = (
      <HomeScreen
        places={allPlaces}
        loading={loading}
        error={error}
        liked={activity.liked}
        unread={!activity.readAlerts}
        onLike={toggleLike}
        onRetry={() => setRetry(retry + 1)}
        photoFor={photoFor}
        recommendedTasters={recommendedTasters}
        preferenceCount={myProfile?.preferenceTags?.length ?? 0}
        onManagePreferences={() => go("profile-edit")}
      />
    );
  else if (route.screen === "map")
    screen = (
      <MapScreen
        places={allPlaces}
        privatePlaces={privateRecords}
        subscriptions={subscriptionIds}
        liked={activity.liked}
        recommendedTasterIds={recommendedTasters.map((taster) => taster.tasterId)}
        query={query}
        onQuery={setQuery}
        loading={loading}
        error={error}
      />
    );
  else if (route.screen === "register")
    screen = (
      <RegisterScreen
        places={allPlaces}
        tasteTags={tasteTags}
        defaultFocus={myProfile?.tasterFocus ?? "BOTH"}
        onRegister={register}
      />
    );
  else if (route.screen === "place")
    screen = activePlace ? (
      <PlaceScreen
        key={activePlace.id}
        place={activePlace}
        own={own}
        liked={activity.liked.includes(activePlace.id)}
        onLike={() => toggleLike(activePlace.id)}
        onMessage={(message) =>
          setNotice({ kind: "info", title: "맛다공에서 알려드려요", message })
        }
      />
    ) : (
      <>
        <ScreenHeader title="맛집 상세" fallback="map" />
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
        tasteTags={tasteTags}
        subscribed={subscriptionIds.includes(activeTaster.tasterId)}
        onSubscribe={() => openSubscription(activeTaster.tasterId)}
      />
    ) : (
      <>
        <ScreenHeader title="맛객 프로필" fallback="my" />
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
        collectionCount={new Set([...activity.registered.map((place) => place.id), ...activity.liked]).size}
        registeredCount={activity.registered.length}
        recentCount={activity.recent.length}
        subscribedCount={subscriptionIds.length}
        recommendedTasterCount={recommendedTasters.length}
        nickname={myProfile?.nickname ?? displayName}
        profileImgUrl={myProfile?.profileImgUrl ?? null}
        avatarVariant={myProfile?.avatarVariant ?? 1}
        incomingSubscriptions={incomingSubscriptions}
        points={points}
      />
    );
  else if (route.screen === "notifications")
    screen = <NotificationsScreen registrations={activity.registered} />;
  else if (route.screen === "subscriptions")
    screen = (
      <SubscriptionsScreen
        tasters={subscriptions.map((subscription) =>
          communityTasters.find(
            (taster) => taster.tasterId === subscription.targetAccountId,
          ) ?? {
            tasterId: subscription.targetAccountId,
            tasterName: subscription.targetNickname,
            tag: "맛객",
            avatar: "",
            avatarVariant: 1,
            note: "맛있는 장소를 찾아 기록하고 있어요.",
          },
        )}
      />
    );
  else if (route.screen === "taster-recommendations")
    screen = <RecommendedTastersScreen tasters={recommendedTasters} />;
  else if (route.screen === "settings")
    screen = <SettingsScreen onLogout={onLogout} />;
  else if (route.screen === "profile-edit")
    screen = myProfile ? (
      <ProfileSettingsScreen
        profile={myProfile}
        options={tasteTags}
        onRequestTag={requestTag}
        onLoadTagRequests={loadTagRequests}
        onSave={async (changes) => {
          await updateMyProfile(accessToken, changes);
          if (changes.avatarFile) await uploadProfileImage(accessToken, changes.avatarFile);
          else if (changes.removeAvatar) await removeProfileImage(accessToken, "avatar");
          if (changes.coverFile) await uploadProfileCover(accessToken, changes.coverFile);
          else if (changes.removeCover) await removeProfileImage(accessToken, "cover");
          await refreshCommunity();
          setNotice({ kind: "success", title: "변경 내용을 저장했어요", message: "프로필과 추천 취향에 반영했어요." });
        }}
        onError={(message) => setNotice({ kind: "error", title: "프로필을 저장하지 못했어요", message })}
      />
    ) : (
      <div className="empty-state"><p>프로필을 불러오고 있어요…</p></div>
    );
  else if (route.screen === "intro") screen = <IntroScreen onComplete={() => go("settings", "", true)} />;
  else {
    const titles = {
      saved: "내 맛집",
      diary: "내가 등록한 맛집",
      liked: "내 맛집",
      recent: "최근 본 맛집",
    };
    const ids =
      route.screen === "saved"
        ? [...new Set([...activity.liked, ...activity.registered.map((place) => place.id)])]
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
          .map((id) => [...allPlaces, ...privateRecords].find((place) => place.id === id))
          .filter((place): place is Place => !!place)}
        liked={activity.liked}
        onLike={toggleLike}
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
      {notice && (
        <NoticeToast
          kind={notice.kind}
          title={notice.title}
          message={notice.message}
          onDismiss={dismissNotice}
        />
      )}
      {subscriptionTarget && (
        <SubscriptionOfferSheet
          taster={subscriptionTarget}
          accessToken={accessToken}
          currentFreeName={currentFreeSubscription?.targetNickname}
          onClose={() => setSubscriptionTarget(null)}
          onComplete={({ replacedFreeNickname, isFree }) => {
            const subscribedName = subscriptionTarget.tasterName;
            setSubscriptionTarget(null);
            void refreshCommunity().catch((cause: Error) =>
              setNotice({ kind: "error", title: "구독 정보를 새로고침하지 못했어요", message: cause.message }),
            );
            setNotice({
              kind: "success",
              title: isFree ? "무료 구독을 시작했어요" : "테스트 구독이 완료됐어요",
              message: replacedFreeNickname
                ? `${replacedFreeNickname} 무료 구독이 종료되고 ${subscribedName} 구독으로 바뀌었어요.`
                : `${subscribedName}의 맛집 소식을 받아볼 수 있어요.`,
            });
          }}
        />
      )}
      {activity.storageError && (
        <div className="storage-error" role="alert">
          {activity.storageError}
        </div>
      )}
    </div>
  );
}
