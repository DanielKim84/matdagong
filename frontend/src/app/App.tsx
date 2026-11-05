/**
 * 로그인한 앱의 뿌리입니다. 서버 상태를 모아 useAppData()로 화면에 넘기고, 주소(#화면)에 맞는 화면과 하단 탭을 그립니다.
 * 상태 묶음은 같은 폴더의 훅(useCommunity, useMyPlaces, usePlaceSearch …)이 맡습니다.
 */
import { useCallback, useEffect, useState } from "react";
import { NotificationDialogProvider, useNotificationDialog } from "../components/NotificationDialog";
import TabBar, { tabForScreen } from "../components/TabBar";
import SubscriptionOfferSheet from "../screens/SubscriptionOfferSheet";
import { isSessionExpiring } from "../services/http";
import {
  getPlace,
  getRecentPlaces,
  getVisitProofPlaceIds,
  rememberRecentPlace,
  saveWishPlace as requestWishPlace,
} from "../services/places";
import { MY_TASTER_ID, type Place, type Taster } from "../models/place";
import { accountIdFromAccessToken } from "../utils/accessToken";
import { accountRole } from "./accountRole";
import { AppDataContext, RETRY_LATER_MESSAGE, type AppData, type AppNotice, type NoticeKind } from "./AppData";
import { enrichPlaces } from "./enrichPlaces";
import LikeChoiceSheet from "./LikeChoiceSheet";
import { useRoute } from "./navigation";
import { recordActions } from "./recordActions";
import { SCREEN_VIEWS } from "./screenViews";
import { useCommunity } from "./useCommunity";
import { useLegacyMigration } from "./useLegacyMigration";
import { useLikeChoice } from "./useLikeChoice";
import { useMyPlaces } from "./useMyPlaces";
import { useNotifications } from "./useNotifications";
import { useSignedInDeviceCheck } from "./useSignedInDeviceCheck";
import { usePlaceSearch } from "./usePlaceSearch";

type Props = { accessToken: string; displayName: string; loginProviders: string[]; onLogout: () => void };

const NOTICE_TONES = { info: "info", success: "success", error: "danger" } as const satisfies Record<
  NoticeKind,
  string
>;

export default function App(props: Props) {
  return (
    <NotificationDialogProvider>
      <AppContent {...props} />
    </NotificationDialogProvider>
  );
}

function AppContent({ accessToken, displayName, loginProviders, onLogout }: Props) {
  const { alert } = useNotificationDialog();
  const authenticatedAccountId = accountIdFromAccessToken(accessToken);
  const route = useRoute();
  const [subscriptionTarget, setSubscriptionTarget] = useState<Taster | null>(null);
  const [detail, setDetail] = useState<Place | null>(null);

  const notify = useCallback(
    (notice: AppNotice) => {
      // 로그인 만료로 재로그인을 시작했다면 동시에 실패한 요청들의 오류 안내는 띄우지 않습니다.
      if (isSessionExpiring()) return;
      void alert({ title: notice.title, message: notice.message, tone: NOTICE_TONES[notice.kind] });
    },
    [alert],
  );
  const notifications = useNotifications(accessToken, route.screen, notify);
  useSignedInDeviceCheck(accessToken);
  const community = useCommunity(accessToken, displayName, notify);
  const { myProfile, refreshCommunity, reloadTasters } = community;
  const search = usePlaceSearch(accessToken, route.screen);
  const { setPlaces } = search;
  const myPlaces = useMyPlaces({ accessToken, screen: route.screen, notify, setPlaces, refreshCommunity });
  const {
    setMyPlaceRecords,
    setRecentPlaces,
    setLikedPlaceIds,
    setVisitedLikedPlaceIds,
    setDislikedPlaceIds,
    setVisitProofPlaceIds,
  } = myPlaces;
  const { legacyRegistered, legacyStillLocal } = useLegacyMigration(accessToken, myProfile?.accountId, {
    setRecentPlaces,
    setMyPlaceState: myPlaces.setMyPlaceState,
    notify,
  });
  /** 장소 응답의 작성자가 나인지 확인합니다. 프로필 응답 전에도 JWT subject로 알아봅니다. */
  const isMyTasterId = (tasterId: string) =>
    tasterId === MY_TASTER_ID || tasterId === authenticatedAccountId || tasterId === myProfile?.accountId;

  /**
   * 하트·기록이 바뀌면 같은 맛집을 둔 맛객 신뢰 %와 가게에 들른 근거가 달라지므로 그 둘만 다시 받습니다.
   * 실패해도 다음 새로고침에 맞춰집니다.
   */
  const refreshTasters = useCallback(() => {
    reloadTasters();
    getVisitProofPlaceIds(accessToken)
      .then(setVisitProofPlaceIds)
      .catch(() => {});
  }, [accessToken, reloadTasters, setVisitProofPlaceIds]);

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
    places: search.places,
    myPlaceRecords: myPlaces.myPlaceRecords,
    recentPlaces: myPlaces.recentPlaces,
    detail,
    routeId: route.id,
    legacyRegistered,
    legacyStillLocal,
    communityTasters: community.communityTasters,
    subscriptions: community.subscriptions,
    incomingSubscriptions: community.incomingSubscriptions,
    myProfile,
    displayName,
    query: search.query,
    isMyTasterId,
  });

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
  }, [route.screen, route.id, hasActivePlace, accessToken, setRecentPlaces]);

  const likeChoice = useLikeChoice({
    accessToken,
    likedPlaceIds: myPlaces.likedPlaceIds,
    visitedLikedPlaceIds: myPlaces.visitedLikedPlaceIds,
    visitProofPlaceIds: myPlaces.visitProofPlaceIds,
    setLikedPlaceIds,
    setVisitedLikedPlaceIds,
    setDislikedPlaceIds,
    placeNameOf: (id) =>
      [...views.places, ...views.recentPlaces, detail].find((place) => place?.id === id)?.name ?? "이 맛집",
    isOwnRecord: (id) =>
      myPlaces.myPlaceRecords.some(
        (place) => place.id === id && place.tasters.some((taster) => isMyTasterId(taster.tasterId)),
      ),
    notify,
    onTrustChanged: refreshTasters,
  });

  const records = recordActions({
    accessToken,
    route,
    query: search.query,
    notify,
    addNotification: notifications.add,
    refreshTasters,
    retryPlaces: search.retry,
    setPlaces,
    setDetail,
    setMyPlaceRecords,
    setLikedPlaceIds,
    setVisitedLikedPlaceIds,
    setDislikedPlaceIds,
  });

  /**
   * 카카오에서 고른 가게를 가볼 곳으로 저장하고, 지도 목록과 하트 상태에 바로 넣습니다.
   * 내 기록이 있는 가게는 서버가 하트하지 않으므로 하트 목록에도 넣지 않습니다.
   */
  async function saveWishPlace(result: KakaoPlaceResult): Promise<Place> {
    const saved = await requestWishPlace(accessToken, result);
    setPlaces((list) => [...list.filter((place) => place.id !== saved.id), saved]);
    if (!saved.tasters.some((taster) => isMyTasterId(taster.tasterId))) {
      setLikedPlaceIds((ids) => (ids.includes(saved.id) ? ids : [...ids, saved.id]));
    }
    return saved;
  }

  function openSubscription(tasterId: string) {
    // 화면에 보이는 맛객은 장소 기록과 커뮤니티 API 응답을 합친 목록에서 찾습니다.
    // API 응답보다 장소 목록이 먼저 도착해도 유효한 샘플 계정의 구독을 막지 않습니다.
    const target = views.tasters.find((taster) => taster.tasterId === tasterId);
    if (!target) {
      notify({ kind: "info", title: "맛객 정보를 확인할 수 없어요", message: RETRY_LATER_MESSAGE });
      return;
    }
    if (views.subscriptionIds.includes(tasterId)) return;
    setSubscriptionTarget(target);
  }

  const appData: AppData = {
    accessToken,
    displayName,
    loginProviders,
    myProfile,
    nickname: myProfile?.nickname ?? displayName,
    accountRole: accountRole(accessToken, views.hasPublicRecord),
    places: views.places,
    privatePlaces: views.privatePlaces,
    myRecords: views.myRecords,
    recentPlaces: views.recentPlaces,
    likedPlaceIds: myPlaces.likedPlaceIds,
    visitedLikedPlaceIds: myPlaces.visitedLikedPlaceIds,
    dislikedPlaceIds: myPlaces.dislikedPlaceIds,
    visitProofPlaceIds: myPlaces.visitProofPlaceIds,
    activePlace: views.activePlace,
    legacyOwnRecord: views.legacyOwnRecord,
    editablePlace: views.editablePlace,
    subscriptions: community.subscriptions,
    subscriptionIds: views.subscriptionIds,
    currentFreeSubscription: community.subscriptions.find((subscription) => subscription.subscriptionType === "FREE"),
    incomingSubscriptions: community.incomingSubscriptions,
    points: community.points,
    reportedTasterIds: community.reportedTasterIds,
    tasters: views.tasters,
    tasterById: views.tasterById,
    recommendedTasters: views.recommendedTasters,
    tasteTags: community.tasteTags,
    subscriptionTarget,
    notificationFeed: notifications.feed,
    notificationLoading: notifications.isLoading,
    notificationError: notifications.error,
    unread: notifications.feed.unreadCount > 0,
    loading: search.isLoading,
    error: search.error,
    query: search.query,
    setQuery: search.setQuery,
    isMyTasterId,
    photoFor: views.photoFor,
    actions: {
      retry: search.retry,
      notify,
      chooseLike: likeChoice.chooseLike,
      saveWishPlace,
      undoDislike: likeChoice.undoDislike,
      openSubscription,
      closeSubscription: () => setSubscriptionTarget(null),
      cancelSubscriptionById: community.cancelSubscriptionById,
      cancelTasterSubscription: community.cancelTasterSubscription,
      reportTaster: community.reportTaster,
      register: records.register,
      startRecordConversion: records.startRecordConversion,
      changeOwnRecordVisibility: records.changeOwnRecordVisibility,
      deleteOwnRecord: records.deleteOwnRecord,
      refreshCommunity,
      refreshNotifications: notifications.refresh,
      markNotificationRead: notifications.markRead,
      markAllNotificationsRead: notifications.markAllRead,
      deleteNotification: notifications.remove,
      deleteAllNotifications: notifications.removeAll,
      requestTag: community.requestTag,
      loadTagRequests: community.loadTagRequests,
      saveProfile: community.saveProfile,
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
        {likeChoice.prompt && (
          <LikeChoiceSheet prompt={likeChoice.prompt} onChoose={likeChoice.choose} onClose={likeChoice.close} />
        )}
      </div>
    </AppDataContext.Provider>
  );
}
