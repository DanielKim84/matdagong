import { useCallback, useEffect, useState, type ComponentType } from "react";
import { NotificationDialogProvider, useNotificationDialog } from "../components/NotificationDialog";
import TabBar, { tabForScreen } from "../components/TabBar";
import CollectionsScreen from "../screens/me/CollectionsScreen";
import AccountSettingsScreen from "../screens/me/AccountSettingsScreen";
import DiaryScreen from "../screens/me/DiaryScreen";
import MeScreen from "../screens/me/MeScreen";
import MyRecordsScreen from "../screens/me/MyRecordsScreen";
import QuickDraftsScreen from "../screens/me/QuickDraftsScreen";
import WalletScreen from "../screens/me/WalletScreen";
import DiscoverScreen from "../screens/discover/DiscoverScreen";
import FeedScreen from "../screens/feed/FeedScreen";
import NotificationsScreen from "../screens/feed/NotificationsScreen";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import PlaceDetailScreen from "../screens/place/PlaceDetailScreen";
import RecordScreen from "../screens/record/RecordScreen";
import SubscriptionsManageScreen from "../screens/tasters/SubscriptionsManageScreen";
import TasterProfileScreen from "../screens/tasters/TasterProfileScreen";
import TastersScreen from "../screens/tasters/TastersScreen";
import SubscriptionOfferSheet from "../screens/SubscriptionOfferSheet";
import {
  cancelSubscription,
  createPlaceRegisteredNotification,
  createTagRequest,
  ensureMyProfile,
  getIncomingSubscriptions,
  getMyTagRequests,
  getPoints,
  getSubscriptions,
  getTasteTags,
  getTasters,
  saveMyProfile,
} from "../services/community";
import { isSessionExpiring } from "../services/http";
import {
  MY_ACTIVITY_CHANGED_EVENT,
  convertLikedPlaceToRecord,
  convertPlaceRecordToLike,
  createPlaceRecord,
  getLikedPlaceIds,
  getMyPlaceRecords,
  getPlace,
  getPlaces,
  getRecentPlaces,
  getVisitedLikedPlaceIds,
  kakaoPlaceFromPlace,
  rememberRecentPlace,
  setPlaceLiked,
} from "../services/places";
import type {
  ActiveSubscription,
  IncomingSubscription,
  MyProfile,
  PointAccount,
  ProfileChanges,
  TagRequestInput,
  TasteTag,
} from "../models/community";
import { MY_TASTER_ID, type NewPlace, type Place, type Screen, type Taster } from "../models/place";
import { accountIdFromAccessToken } from "../utils/accessToken";
import { errorMessage } from "../utils/errorMessage";
import { STORAGE_KEYS, writeStorageJson } from "../utils/storage";
import { accountRole } from "./accountRole";
import { AppDataContext, type AppData, type AppNotice, type NoticeKind } from "./AppData";
import { enrichPlaces } from "./enrichPlaces";
import { go, useRoute } from "./navigation";
import ProfileEditRoute from "./ProfileEditRoute";
import { useLegacyMigration } from "./useLegacyMigration";
import { useNotifications } from "./useNotifications";

type Props = { accessToken: string; displayName: string; onLogout: () => void };

const EMPTY_POINTS: PointAccount = { balance: 0, history: [] };
const RETRY_LATER = "잠시 후 다시 시도해 주세요.";
const NOTICE_TONES = { info: "info", success: "success", error: "danger" } as const satisfies Record<
  NoticeKind,
  string
>;

/** 주소(#화면)별로 그릴 화면입니다. 모음 화면(saved·liked·recent)은 CollectionsScreen 하나가 주소를 보고 나눠 그립니다. */
const SCREEN_VIEWS: Record<Screen, ComponentType<{ routeId: string }>> = {
  home: DiscoverScreen,
  map: DiscoverScreen,
  feed: FeedScreen,
  register: RecordScreen,
  place: PlaceDetailScreen,
  profile: TasterProfileScreen,
  tasters: TastersScreen,
  "taster-recommendations": TastersScreen,
  subscriptions: SubscriptionsManageScreen,
  my: MeScreen,
  diary: DiaryScreen,
  wallet: WalletScreen,
  "my-records": MyRecordsScreen,
  drafts: QuickDraftsScreen,
  notifications: NotificationsScreen,
  settings: AccountSettingsScreen,
  intro: OnboardingScreen,
  "profile-edit": ProfileEditRoute,
  saved: CollectionsScreen,
  liked: CollectionsScreen,
  recent: CollectionsScreen,
};

/** 내 요약(기록·하트·최근 본 장소)을 다시 읽어야 하는 화면입니다. */
const MY_SUMMARY_SCREENS: Screen[] = ["my", "recent", "saved", "liked", "my-records"];

export default function App(props: Props) {
  return (
    <NotificationDialogProvider>
      <AppContent {...props} />
    </NotificationDialogProvider>
  );
}

function AppContent({ accessToken, displayName, onLogout }: Props) {
  const { alert, confirm } = useNotificationDialog();
  const authenticatedAccountId = accountIdFromAccessToken(accessToken);
  const route = useRoute();
  const [communityTasters, setCommunityTasters] = useState<Taster[]>([]);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [tasteTags, setTasteTags] = useState<TasteTag[]>([]);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
  const [incomingSubscriptions, setIncomingSubscriptions] = useState<IncomingSubscription[]>([]);
  const [points, setPoints] = useState<PointAccount>(EMPTY_POINTS);
  const [subscriptionTarget, setSubscriptionTarget] = useState<Taster | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [myPlaceRecords, setMyPlaceRecords] = useState<Place[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<Place[]>([]);
  const [likedPlaceIds, setLikedPlaceIds] = useState<string[]>([]);
  const [visitedLikedPlaceIds, setVisitedLikedPlaceIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const notify = useCallback(
    (notice: AppNotice) => {
      // 로그인 만료로 재로그인을 시작했다면 동시에 실패한 요청들의 오류 안내는 띄우지 않습니다.
      if (isSessionExpiring()) return;
      void alert({ title: notice.title, message: notice.message, tone: NOTICE_TONES[notice.kind] });
    },
    [alert],
  );
  const setMyPlaceState = useCallback((records: Place[], likedIds: string[], visitedLikedIds: string[]) => {
    setMyPlaceRecords(records);
    setLikedPlaceIds(likedIds);
    setVisitedLikedPlaceIds(visitedLikedIds);
  }, []);
  const notifications = useNotifications(accessToken, route.screen, notify);
  const { legacyRegistered, legacyStillLocal } = useLegacyMigration(accessToken, myProfile?.accountId, {
    setRecentPlaces,
    setMyPlaceState,
    notify,
  });
  const requestTag = useCallback((input: TagRequestInput) => createTagRequest(accessToken, input), [accessToken]);
  const loadTagRequests = useCallback(() => getMyTagRequests(accessToken), [accessToken]);
  /** 장소 응답의 작성자가 나인지 확인합니다. 프로필 응답 전에도 JWT subject로 알아봅니다. */
  const isMyTasterId = (tasterId: string) =>
    tasterId === MY_TASTER_ID || tasterId === authenticatedAccountId || tasterId === myProfile?.accountId;

  const refreshCommunity = useCallback(async () => {
    const profile = await ensureMyProfile(accessToken, displayName);
    setMyProfile(profile);
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
    setCommunityTasters(tastersResult.value);
    setSubscriptions(subscriptionsResult.status === "fulfilled" ? subscriptionsResult.value : []);
    setTasteTags(tasteTagsResult.status === "fulfilled" ? tasteTagsResult.value : []);
    setIncomingSubscriptions(incomingResult.status === "fulfilled" ? incomingResult.value : []);
    setPoints(pointsResult.status === "fulfilled" ? pointsResult.value : EMPTY_POINTS);
    const unavailable = results.find((result) => result.status === "rejected");
    if (unavailable?.status === "rejected") {
      notify({
        kind: "error",
        title: "일부 정보를 불러오지 못했어요",
        message: errorMessage(unavailable.reason, RETRY_LATER),
      });
    }
  }, [accessToken, displayName, notify]);

  useEffect(() => {
    refreshCommunity().catch((cause: unknown) =>
      notify({ kind: "error", title: "서비스 정보를 불러오지 못했어요", message: errorMessage(cause, RETRY_LATER) }),
    );
  }, [refreshCommunity, notify]);

  const refreshMySummary = useCallback(async () => {
    const [records, likedIds, visitedLikedIds, recent, placeList] = await Promise.allSettled([
      getMyPlaceRecords(accessToken),
      getLikedPlaceIds(accessToken),
      getVisitedLikedPlaceIds(accessToken),
      getRecentPlaces(accessToken),
      getPlaces(accessToken, ""),
    ]);
    if (records.status === "fulfilled") setMyPlaceRecords(records.value);
    if (likedIds.status === "fulfilled") setLikedPlaceIds(likedIds.value);
    if (visitedLikedIds.status === "fulfilled") setVisitedLikedPlaceIds(visitedLikedIds.value);
    if (recent.status === "fulfilled") setRecentPlaces(recent.value);
    if (placeList.status === "fulfilled") setPlaces(placeList.value);
    await refreshCommunity();
  }, [accessToken, refreshCommunity]);

  useEffect(() => {
    if (MY_SUMMARY_SCREENS.includes(route.screen)) void refreshMySummary().catch(() => {});
    const refreshAfterActivityChange = () => void refreshMySummary().catch(() => {});
    window.addEventListener(MY_ACTIVITY_CHANGED_EVENT, refreshAfterActivityChange);
    return () => window.removeEventListener(MY_ACTIVITY_CHANGED_EVENT, refreshAfterActivityChange);
  }, [route.screen, refreshMySummary]);

  useEffect(() => {
    // 지도 검색 입력은 짧게 모아서 보내고, 화면 이동이나 새 검색이 오면 이전 요청을 취소합니다.
    const controller = new AbortController();
    setIsLoading(true);
    const timeout = window.setTimeout(
      () => {
        getPlaces(accessToken, query.trim(), controller.signal)
          .then((result) => {
            setPlaces(result);
            setError("");
          })
          .catch((cause: unknown) => {
            if (!controller.signal.aborted) setError(errorMessage(cause, "맛집을 불러오지 못했어요."));
          })
          .finally(() => {
            if (!controller.signal.aborted) setIsLoading(false);
          });
      },
      query ? 250 : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, retryCount, accessToken]);

  useEffect(() => {
    let active = true;
    Promise.all([getMyPlaceRecords(accessToken), getLikedPlaceIds(accessToken), getVisitedLikedPlaceIds(accessToken)])
      .then(([records, likedIds, visitedLikedIds]) => {
        if (active) setMyPlaceState(records, likedIds, visitedLikedIds);
      })
      .catch((cause: unknown) => {
        if (active)
          notify({
            kind: "error",
            title: "내 맛집 기록을 불러오지 못했어요",
            message: errorMessage(cause, RETRY_LATER),
          });
      });
    return () => {
      active = false;
    };
  }, [accessToken, setMyPlaceState, notify]);

  useEffect(() => {
    let active = true;
    getRecentPlaces(accessToken)
      .then((items) => {
        if (active) setRecentPlaces(items);
      })
      .catch((cause: unknown) => {
        if (active)
          notify({
            kind: "error",
            title: "최근 본 맛집을 불러오지 못했어요",
            message: errorMessage(cause, RETRY_LATER),
          });
      });
    return () => {
      active = false;
    };
  }, [accessToken, notify]);

  useEffect(() => {
    if (route.screen !== "map") setQuery("");
  }, [route.screen]);

  useEffect(() => {
    let active = true;
    if (route.screen === "place" && route.id && !route.id.startsWith("local-")) {
      getPlace(accessToken, route.id)
        .then((place) => {
          if (active) setDetail(place);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [route.screen, route.id, accessToken]);

  const views = enrichPlaces({
    places,
    myPlaceRecords,
    recentPlaces,
    detail,
    routeId: route.id,
    legacyRegistered,
    legacyStillLocal,
    communityTasters,
    subscriptions,
    incomingSubscriptions,
    myProfile,
    displayName,
    query,
    isMyTasterId,
  });
  const currentFreeSubscription = subscriptions.find((subscription) => subscription.subscriptionType === "FREE");

  const hasActivePlace = !!views.activePlace;
  useEffect(() => {
    if (route.screen !== "place" || !hasActivePlace) return;
    let active = true;
    rememberRecentPlace(accessToken, route.id)
      .then(() => getRecentPlaces(accessToken))
      .then((items) => {
        if (active) setRecentPlaces(items);
      })
      .catch(() => {
        // 장소 상세 화면은 열람 기록 저장 실패와 관계없이 계속 사용할 수 있습니다.
      });
    return () => {
      active = false;
    };
  }, [route.screen, route.id, hasActivePlace, accessToken]);

  async function toggleLike(id: string) {
    const wasLiked = likedPlaceIds.includes(id);
    if (wasLiked) {
      const placeName = places.find((place) => place.id === id)?.name ?? "이 맛집";
      const isAccepted = await confirm({
        title: "내 맛집에서 삭제할까요?",
        message: `‘${placeName}’을 내 맛집 목록에서 삭제할까요?`,
        confirmLabel: "삭제할게요",
        tone: "danger",
      });
      if (!isAccepted) return;
    }
    const isAlreadyRegistered = myPlaceRecords.some(
      (place) => place.id === id && place.tasters.some((taster) => isMyTasterId(taster.tasterId)),
    );
    if (!wasLiked && isAlreadyRegistered) {
      notify({
        kind: "info",
        title: "이미 내가 등록한 맛집이에요",
        message: "내 맛집으로 바꾸려면 맛집 상세에서 ‘내 맛집으로 변경’을 선택해 주세요.",
      });
      return;
    }
    try {
      await setPlaceLiked(accessToken, id, !wasLiked);
      setLikedPlaceIds((current) => (wasLiked ? current.filter((item) => item !== id) : [id, ...current]));
      if (wasLiked) setVisitedLikedPlaceIds((current) => current.filter((item) => item !== id));
      notify({
        kind: "success",
        title: wasLiked ? "내 맛집에서 삭제했어요" : "내 맛집에 추가했어요",
        message: wasLiked ? "저장해 둔 맛집에서 제외했어요." : "내 맛집에서 다시 볼 수 있어요.",
      });
    } catch (cause) {
      notify({ kind: "error", title: "내 맛집을 변경하지 못했어요", message: errorMessage(cause, RETRY_LATER) });
    }
  }

  /** 기록을 저장하고 저장된 장소를 돌려줍니다. stayOnScreen이면 새 기록 저장 뒤 상세로 옮기지 않고 호출한 화면이 완료 화면을 그립니다. */
  async function register(
    place: NewPlace,
    convertFromPlaceId?: string,
    visitedConfirmed = false,
    stayOnScreen = false,
  ): Promise<Place> {
    // 등록 화면 주소에 기록 ID가 있으면(#register/<id>) 기존 기록 수정입니다.
    const isEditing = route.screen === "register" && !!route.id;
    try {
      if (convertFromPlaceId && !visitedConfirmed) {
        throw new Error("직접 방문을 확인한 뒤 등록해 주세요.");
      }
      const created = convertFromPlaceId
        ? await convertLikedPlaceToRecord(accessToken, convertFromPlaceId, place)
        : await createPlaceRecord(accessToken, place);
      // 수정은 새 알림을 만들지 않으므로 알림 저장 실패로 보지 않습니다.
      let isNotificationSaved = isEditing;
      if (!isEditing) {
        try {
          notifications.add(await createPlaceRegisteredNotification(accessToken, created.id));
          isNotificationSaved = true;
        } catch {
          isNotificationSaved = false;
        }
      }
      if (convertFromPlaceId) {
        setLikedPlaceIds((current) => current.filter((item) => item !== convertFromPlaceId));
        setVisitedLikedPlaceIds((current) => current.filter((item) => item !== convertFromPlaceId));
      }
      setMyPlaceRecords((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      if (place.visibility === "public")
        setPlaces((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setDetail(created);
      if (isEditing) setRetryCount((current) => current + 1);
      const shouldStay = stayOnScreen && !isEditing;
      if (!shouldStay) {
        // 등록 완료 상세에서 뒤로 가면 등록 폼 대신 지도로 돌아가도록 경로를 정리합니다.
        go("map", "", true);
        go("place", created.id);
      }
      if (!shouldStay || !isNotificationSaved)
        notify(
          isNotificationSaved
            ? {
                kind: "success",
                title: isEditing ? "맛집 내용을 수정했어요" : "맛집을 등록했어요",
                message: isEditing ? "변경한 내용을 저장했어요." : "맛객 기록과 알림을 저장했어요.",
              }
            : {
                kind: "error",
                title: "맛집은 등록했지만 알림 저장에 실패했어요",
                message: "맛집 기록은 저장됐어요. 알림함에는 다시 표시되지 않을 수 있어요.",
              },
        );
      return created;
    } catch (cause) {
      notify({
        kind: "error",
        title: isEditing ? "맛집 내용을 수정하지 못했어요" : "맛집을 등록하지 못했어요",
        message: errorMessage(cause, RETRY_LATER),
      });
      throw cause;
    }
  }

  /** 하트로 저장한 맛집을 방문 기록으로 바꾸도록 등록 화면에 장소를 넘깁니다. 카카오 장소 ID가 없으면 이름으로 다시 검색하게 합니다. */
  function startRecordConversion(place: Place) {
    writeStorageJson(
      STORAGE_KEYS.likeConversionHandoff,
      { sourcePlaceId: place.id, place: kakaoPlaceFromPlace(place), searchName: place.name },
      "session",
    );
    go("register");
  }

  async function convertRecordToLike(place: Place) {
    try {
      await convertPlaceRecordToLike(accessToken, place.id);
      const withoutMyRecord = (item: Place): Place => {
        const ownRecord = item.tasters.find((taster) => isMyTasterId(taster.tasterId));
        return {
          ...item,
          tasters: item.tasters.filter((taster) => !isMyTasterId(taster.tasterId)),
          recordCount: Math.max(0, item.recordCount - (ownRecord?.visibility === "PUBLIC" ? 1 : 0)),
        };
      };
      setMyPlaceRecords((current) => current.filter((item) => item.id !== place.id));
      setPlaces((current) => current.map((item) => (item.id === place.id ? withoutMyRecord(item) : item)));
      setLikedPlaceIds((current) => (current.includes(place.id) ? current : [place.id, ...current]));
      setVisitedLikedPlaceIds((current) => (current.includes(place.id) ? current : [place.id, ...current]));
      setDetail(withoutMyRecord(place));
      // 변경은 서버에서 이미 완료됐으므로, 새 목록 조회가 잠시 실패해도 성공 상태를 유지합니다.
      const [records, placeList, likedIds, refreshedPlace, visitedLikedIds] = await Promise.allSettled([
        getMyPlaceRecords(accessToken),
        getPlaces(accessToken, query.trim()),
        getLikedPlaceIds(accessToken),
        getPlace(accessToken, place.id),
        getVisitedLikedPlaceIds(accessToken),
      ]);
      if (records.status === "fulfilled") setMyPlaceRecords(records.value);
      if (placeList.status === "fulfilled") setPlaces(placeList.value);
      if (likedIds.status === "fulfilled") setLikedPlaceIds(likedIds.value);
      if (refreshedPlace.status === "fulfilled") setDetail(refreshedPlace.value);
      // 기록을 내 맛집으로 바꾼 것 자체가 방문했다는 뜻입니다. 함께 진행 중이던 조회가
      // 방금 저장된 방문 표시보다 먼저 돌아와도 이 장소의 방문 표시는 남겨 둡니다.
      if (visitedLikedIds.status === "fulfilled") {
        setVisitedLikedPlaceIds((current) => [...new Set([...current, ...visitedLikedIds.value, place.id])]);
      }
      notify({
        kind: "success",
        title: "내 맛집으로 변경했어요",
        message: "직접 작성한 기록을 삭제하고 내 맛집에 저장했어요.",
      });
    } catch (cause) {
      notify({ kind: "error", title: "내 맛집으로 변경하지 못했어요", message: errorMessage(cause, RETRY_LATER) });
    }
  }

  function openSubscription(tasterId: string) {
    // 화면에 보이는 맛객은 장소 기록과 커뮤니티 API 응답을 합친 목록에서 찾습니다.
    // API 응답보다 장소 목록이 먼저 도착해도 유효한 샘플 계정의 구독을 막지 않습니다.
    const target = views.tasters.find((taster) => taster.tasterId === tasterId);
    if (!target) {
      notify({ kind: "info", title: "맛객 정보를 확인할 수 없어요", message: RETRY_LATER });
      return;
    }
    if (views.subscriptionIds.includes(tasterId)) return;
    setSubscriptionTarget(target);
  }

  /** 맛객 프로필과 구독 목록의 구독 취소가 같은 안내와 새로고침을 쓰도록 한곳에서 처리합니다. */
  async function cancelSubscriptionById(subscriptionId: string) {
    try {
      await cancelSubscription(accessToken, subscriptionId);
      setSubscriptions(await getSubscriptions(accessToken));
      notify({ kind: "success", title: "구독을 취소했어요", message: "언제든 다시 구독할 수 있어요." });
    } catch (cause) {
      notify({ kind: "error", title: "구독을 취소하지 못했어요", message: errorMessage(cause, RETRY_LATER) });
    }
  }

  async function cancelTasterSubscription(tasterId: string) {
    const subscription = subscriptions.find((item) => item.targetAccountId === tasterId);
    if (subscription) await cancelSubscriptionById(subscription.subscriptionId);
  }

  async function saveProfile(changes: ProfileChanges) {
    // 부가 맛객 목록을 새로 읽지 못해도 저장된 프로필은 화면 상태에 즉시 반영합니다.
    setMyProfile(await saveMyProfile(accessToken, changes));
    let isRefreshFailed = false;
    try {
      await refreshCommunity();
    } catch {
      isRefreshFailed = true;
    }
    notify({
      kind: "success",
      title: "변경 내용을 저장했어요",
      message: isRefreshFailed
        ? "프로필과 취향은 저장됐어요. 다른 화면 정보는 잠시 후 다시 불러와요."
        : "프로필과 추천 취향에 반영했어요.",
    });
  }

  const appData: AppData = {
    accessToken,
    displayName,
    myProfile,
    nickname: myProfile?.nickname ?? displayName,
    accountRole: accountRole(accessToken, views.hasPublicRecord),
    places: views.places,
    privatePlaces: views.privatePlaces,
    myRecords: views.myRecords,
    recentPlaces: views.recentPlaces,
    likedPlaceIds,
    visitedLikedPlaceIds,
    activePlace: views.activePlace,
    legacyOwnRecord: views.legacyOwnRecord,
    editablePlace: views.editablePlace,
    subscriptions,
    subscriptionIds: views.subscriptionIds,
    currentFreeSubscription,
    incomingSubscriptions,
    points,
    tasters: views.tasters,
    tasterById: views.tasterById,
    recommendedTasters: views.recommendedTasters,
    tasteTags,
    subscriptionTarget,
    notificationFeed: notifications.feed,
    notificationLoading: notifications.isLoading,
    notificationError: notifications.error,
    unread: notifications.feed.unreadCount > 0,
    loading: isLoading,
    error,
    query,
    setQuery,
    isMyTasterId,
    photoFor: views.photoFor,
    actions: {
      retry: () => setRetryCount((current) => current + 1),
      notify,
      toggleLike,
      openSubscription,
      closeSubscription: () => setSubscriptionTarget(null),
      cancelSubscriptionById,
      cancelTasterSubscription,
      register,
      startRecordConversion,
      convertRecordToLike,
      refreshCommunity,
      refreshNotifications: notifications.refresh,
      markNotificationRead: notifications.markRead,
      markAllNotificationsRead: notifications.markAllRead,
      deleteNotification: notifications.remove,
      deleteAllNotifications: notifications.removeAll,
      requestTag,
      loadTagRequests,
      saveProfile,
      logout: onLogout,
    },
  };

  // 하단 탭은 발견·피드·맛객·나 첫 화면에서만 보이고, 나머지 화면은 각자 상단 바의 뒤로 버튼을 씁니다.
  const activeTab = tabForScreen(route.screen);
  const ScreenView = SCREEN_VIEWS[route.screen];

  return (
    <AppDataContext.Provider value={appData}>
      <div className={`app-view ${activeTab ? "has-tabbar" : ""}`}>
        <div className="screen-content" key={route.screen}>
          <ScreenView routeId={route.id} />
        </div>
        {activeTab && <TabBar active={activeTab} />}
        {subscriptionTarget && <SubscriptionOfferSheet />}
      </div>
    </AppDataContext.Provider>
  );
}
