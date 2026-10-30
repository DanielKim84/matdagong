import { useCallback, useEffect, useRef, useState } from "react";
import type { NewPlace, Place, Taster } from "../models/place";
import { MY_ACTIVITY_CHANGED_EVENT, createPlaceRecord, convertLikedPlaceToRecord, convertPlaceRecordToLike, getLikedPlaceIds, getVisitedLikedPlaceIds, getMyPlaceRecords, getPlaces, getPlace, getRecentPlaces, kakaoPlaceFromPlace, rememberRecentPlace, setPlaceLiked } from "../services/places";
import { LEGACY_ACTIVITY_STORAGE_KEYS, useActivity } from "../services/activity";
import { isSessionExpiring } from "../services/http";
import { LIKE_CONVERSION_HANDOFF_KEY } from "../services/registerDraft";
import { accessTokenClaims, accountIdFromAccessToken } from "../utils/accessToken";
import { go, useRoute } from "./navigation";
import ProfileSettingsScreen from "../screens/ProfileSettingsScreen";
import { AppDataContext, type AppData } from "./AppData";
import TabBar, { tabForScreen } from "../components/TabBar";
import DiscoverScreen from "../screens/discover/DiscoverScreen";
import FeedScreen from "../screens/feed/FeedScreen";
import NotificationsScreen from "../screens/feed/NotificationsScreen";
import RecordScreen from "../screens/record/RecordScreen";
import PlaceDetailScreen from "../screens/place/PlaceDetailScreen";
import TastersScreen from "../screens/tasters/TastersScreen";
import TasterProfileScreen from "../screens/tasters/TasterProfileScreen";
import SubscriptionsManageScreen from "../screens/tasters/SubscriptionsManageScreen";
import MeScreen from "../screens/me/MeScreen";
import DiaryScreen from "../screens/me/DiaryScreen";
import CollectionsScreen from "../screens/me/CollectionsScreen";
import WalletScreen from "../screens/me/WalletScreen";
import AccountSettingsScreen from "../screens/me/AccountSettingsScreen";
import OnboardingScreen from "../screens/onboarding/OnboardingScreen";
import NoticeToast, { type NoticeKind } from "../components/NoticeToast";
import { NotificationDialogProvider, useNotificationDialog } from "../components/NotificationDialog";
import SubscriptionOfferSheet from "../screens/SubscriptionOfferSheet";
import {
  ensureMyProfile,
  getSubscriptions,
  cancelSubscription,
  getIncomingSubscriptions,
  getPoints,
  getTasteTags,
  getTasters,
  getNotifications,
  createPlaceRegisteredNotification,
  markNotificationRead,
  markAllNotificationsRead,
  markPassiveNotificationsRead,
  deleteNotification,
  deleteAllNotifications,
  type ActiveSubscription,
  type IncomingSubscription,
  type PointAccount,
  type MyProfile,
  type TasteTag,
  type NotificationFeed,
  type UserNotification,
  uploadProfileImage,
  uploadProfileCovers,
  removeProfileImage,
  removeProfileCoverPhoto,
  updateMyProfile,
  createTagRequest,
  getMyTagRequests,
  type TagRequestInput,
} from "../services/community";

type Props = { accessToken: string; displayName: string; onLogout: () => void };
type Notice = { kind: NoticeKind; title: string; message: string };
type AccountRole = "ADMIN" | "SUPER_TASTER" | "TASTER" | "USER";

/**
 * 마이 화면 배지에 보여줄 역할입니다. 관리자·슈퍼 맛객은 공통 계정 토큰의 roles/authorities에서 읽고,
 * 맛객 여부는 공개 기록이 있는지로 계산합니다. 표시용일 뿐 실제 권한 확인은 서버가 합니다.
 */
function accountRole(accessToken: string, hasPublicRecord: boolean): AccountRole {
  const claims = accessTokenClaims(accessToken);
  // 표시용 권한을 읽지 못해도 공개 기록 여부로 기본 역할을 보여줍니다.
  const values = [claims?.roles, claims?.authorities].flatMap((value) => Array.isArray(value) ? value : value ? [value] : []);
  const roles = values.map((value) => typeof value === "string"
    ? value.toUpperCase()
    : value && typeof value === "object" && "authority" in value
      ? String((value as { authority: unknown }).authority).toUpperCase()
      : "");
  if (roles.some((role) => role === "ADMIN" || role === "ROLE_ADMIN")) return "ADMIN";
  if (roles.some((role) => role === "SUPER_TASTER" || role === "ROLE_SUPER_TASTER")) return "SUPER_TASTER";
  return hasPublicRecord ? "TASTER" : "USER";
}

// 이전 브라우저 기록(services/activity.ts)을 계정별로 서버에 옮겼는지 표시하는 localStorage 키입니다.
const recentMigrationKey = (accountId: string) => `matdagong-recent-db-sync-v1:${accountId}`;
const placeMigrationKey = (accountId: string) => `matdagong-place-server-sync-v1:${accountId}`;

/** 이전 버전이 브라우저에만 저장했던 등록 기록을 서버로 옮기기 전까지 화면에 보여줄 장소 형태로 바꿉니다. */
function registeredPlace(item: NewPlace): Place {
  return {
    id: item.id,
    providerCode: item.providerCode,
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
    tasters: [{
      tasterId: "me",
      tasterName: "맛다공이",
      tag: "내가 발견한 맛집",
      avatar: "",
      avatarVariant: 1,
      note: item.reason,
      menus: item.menus,
      photos: item.photos,
      tags: item.tags,
      tagGroups: item.tagGroups,
      visitConditions: item.visitConditions,
    }],
  };
}

export default function App(props: Props) {
  return (
    <NotificationDialogProvider>
      <AppContent {...props} />
    </NotificationDialogProvider>
  );
}

function AppContent({ accessToken, displayName, onLogout }: Props) {
  const { confirm } = useNotificationDialog();
  const authenticatedAccountId = accountIdFromAccessToken(accessToken);
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
  const [myPlaceRecords, setMyPlaceRecords] = useState<Place[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<Place[]>([]);
  const [likedPlaceIds, setLikedPlaceIds] = useState<string[]>([]);
  const [visitedLikedPlaceIds, setVisitedLikedPlaceIds] = useState<string[]>([]);
  // 이전 브라우저 기록을 계정 DB로 옮기는 작업이 같은 계정에서 중복 실행되지 않게 합니다.
  const legacySyncStarted = useRef(new Set<string>());
  const [detail, setDetail] = useState<Place | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [notice, setNoticeState] = useState<Notice | null>(null);
  // 로그인 만료로 재로그인을 시작했다면 동시에 실패한 요청들의 오류 안내는 띄우지 않습니다.
  const setNotice = useCallback((next: Notice | null) => {
    if (next && isSessionExpiring()) return;
    setNoticeState(next);
  }, []);
  const [notificationFeed, setNotificationFeed] = useState<NotificationFeed>({ items: [], unreadCount: 0 });
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");
  const notificationRequest = useRef<Promise<NotificationFeed | null> | null>(null);
  const legacyRecentSyncStarted = useRef(new Set<string>());
  const dismissNotice = useCallback(() => setNotice(null), [setNotice]);
  /** 장소 응답의 작성자가 나인지 확인합니다. 프로필 응답 전에도 JWT subject로 알아봅니다. */
  const isMyTasterId = (tasterId: string) => tasterId === "me"
    || tasterId === authenticatedAccountId
    || tasterId === myProfile?.accountId;

  const refreshNotifications = useCallback(async (showLoading = false) => {
    if (notificationRequest.current) return notificationRequest.current;
    if (showLoading) setNotificationLoading(true);
    const request = (async () => {
      try {
        const feed = await getNotifications(accessToken);
        setNotificationFeed(feed);
        setNotificationError("");
        return feed;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "알림을 불러오지 못했어요.";
        setNotificationError(message);
        return null;
      } finally {
        setNotificationLoading(false);
        notificationRequest.current = null;
      }
    })();
    notificationRequest.current = request;
    return request;
  }, [accessToken]);

  useEffect(() => {
    void refreshNotifications();
    const timer = window.setInterval(() => void refreshNotifications(), 60_000);
    const refreshOnFocus = () => void refreshNotifications();
    window.addEventListener("focus", refreshOnFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
    };
  }, [refreshNotifications]);

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
    setPoints(pointsResult.status === "fulfilled" ? pointsResult.value : { balance: 0, history: [] });
    const unavailable = results.find((result) => result.status === "rejected");
    if (unavailable?.status === "rejected") {
      setNotice({ kind: "error", title: "일부 정보를 불러오지 못했어요", message: unavailable.reason instanceof Error ? unavailable.reason.message : "잠시 후 다시 시도해 주세요." });
    }
  }, [accessToken, displayName, setNotice]);

  useEffect(() => {
    refreshCommunity().catch((cause: Error) =>
      setNotice({
        kind: "error",
        title: "서비스 정보를 불러오지 못했어요",
        message: cause.message,
      }),
    );
  }, [refreshCommunity, setNotice]);

  const refreshMySummary = useCallback(async () => {
    const [records, likedIds, visitedLikedIds, recent, placeList] = await Promise.allSettled([
      getMyPlaceRecords(accessToken),
      getLikedPlaceIds(accessToken),
      getVisitedLikedPlaceIds(accessToken),
      getRecentPlaces(accessToken),
      getPlaces("", accessToken),
    ]);
    if (records.status === "fulfilled") setMyPlaceRecords(records.value);
    if (likedIds.status === "fulfilled") setLikedPlaceIds(likedIds.value);
    if (visitedLikedIds.status === "fulfilled") setVisitedLikedPlaceIds(visitedLikedIds.value);
    if (recent.status === "fulfilled") setRecentPlaces(recent.value);
    if (placeList.status === "fulfilled") setPlaces(placeList.value);
    await refreshCommunity();
  }, [accessToken, refreshCommunity]);

  useEffect(() => {
    if (route.screen === "my" || route.screen === "recent" || route.screen === "saved" || route.screen === "liked") void refreshMySummary().catch(() => {});
    const refreshAfterActivityChange = () => void refreshMySummary().catch(() => {});
    window.addEventListener(MY_ACTIVITY_CHANGED_EVENT, refreshAfterActivityChange);
    return () => window.removeEventListener(MY_ACTIVITY_CHANGED_EVENT, refreshAfterActivityChange);
  }, [route.screen, refreshMySummary]);

  useEffect(() => {
    // 지도 검색 입력은 짧게 모아서 보내고, 화면 이동이나 새 검색이 오면 이전 요청을 취소합니다.
    const controller = new AbortController();
    setLoading(true);
    const timeout = window.setTimeout(
      () => {
        getPlaces(query.trim(), accessToken, controller.signal)
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
  }, [query, retry, accessToken]);

  useEffect(() => {
    let active = true;
    Promise.all([getMyPlaceRecords(accessToken), getLikedPlaceIds(accessToken), getVisitedLikedPlaceIds(accessToken)])
      .then(([records, likedIds, visitedLikedIds]) => {
        if (!active) return;
        setMyPlaceRecords(records);
        setLikedPlaceIds(likedIds);
        setVisitedLikedPlaceIds(visitedLikedIds);
      })
      .catch((cause: Error) => {
        if (active) setNotice({ kind: "error", title: "내 맛집 기록을 불러오지 못했어요", message: cause.message });
      });
    return () => { active = false; };
  }, [accessToken, setNotice]);

  useEffect(() => {
    let active = true;
    getRecentPlaces(accessToken)
      .then((items) => { if (active) setRecentPlaces(items); })
      .catch((cause: Error) => {
        if (active) setNotice({ kind: "error", title: "최근 본 맛집을 불러오지 못했어요", message: cause.message });
      });
    return () => { active = false; };
  }, [accessToken, setNotice]);

  // ── 이전 버전 브라우저 기록 이전 ──
  // 서버 저장 전 버전은 최근 본 장소·등록 기록·하트를 이 브라우저(localStorage)에만 남겼습니다.
  // 계정별로 한 번 서버에 옮기고 완료 표시를 남기며, 두 이전이 모두 끝나면 이전 저장소를 지웁니다.
  // 아직 옮기지 못한 사용자의 기록을 잃지 않도록 유지합니다.
  useEffect(() => {
    const accountId = myProfile?.accountId;
    if (!accountId) return;
    const migrationKey = recentMigrationKey(accountId);
    if (localStorage.getItem(migrationKey) || legacyRecentSyncStarted.current.has(accountId)) return;
    legacyRecentSyncStarted.current.add(accountId);
    let active = true;
    (async () => {
      const savedPlaces = await getRecentPlaces(accessToken);
      const savedIds = new Set(savedPlaces.map((place) => place.id));
      for (const placeId of activity.recent) {
        if (!savedIds.has(placeId)) {
          try { await rememberRecentPlace(accessToken, placeId); }
          catch { /* 만료되었거나 삭제된 이전 기기 기록은 이전하지 않습니다. */ }
        }
      }
      localStorage.setItem(migrationKey, "done");
      const mergedPlaces = await getRecentPlaces(accessToken);
      if (active) setRecentPlaces(mergedPlaces);
    })().catch(() => {
      // 이전 브라우저 기록 이전은 실패해도 상세 화면 열람을 막지 않습니다.
      legacyRecentSyncStarted.current.delete(accountId);
    });
    return () => { active = false; };
  }, [accessToken, activity.recent, myProfile?.accountId]);

  useEffect(() => {
    const accountId = myProfile?.accountId;
    if (!accountId) return;
    const migrationKey = placeMigrationKey(accountId);
    if (localStorage.getItem(migrationKey) || legacySyncStarted.current.has(accountId)) return;
    legacySyncStarted.current.add(accountId);
    let active = true;
    // 이전 버전에서 이 브라우저에만 저장했던 카카오 장소 기록과 하트를 계정 DB로 옮깁니다.
    (async () => {
      for (const place of activity.registered) {
        if (!place.providerPlaceId || place.reason.trim().length < 5) continue;
        await createPlaceRecord(accessToken, place);
      }
      for (const placeId of activity.liked) await setPlaceLiked(accessToken, placeId, true);
      const [records, likedIds, visitedLikedIds] = await Promise.all([
        getMyPlaceRecords(accessToken),
        getLikedPlaceIds(accessToken),
        getVisitedLikedPlaceIds(accessToken),
      ]);
      localStorage.setItem(migrationKey, "done");
      if (active) {
        setMyPlaceRecords(records);
        setLikedPlaceIds(likedIds);
        setVisitedLikedPlaceIds(visitedLikedIds);
      }
    })().catch((cause: Error) => {
      legacySyncStarted.current.delete(accountId);
      if (active) setNotice({ kind: "error", title: "기존 맛집 기록을 옮기지 못했어요", message: cause.message });
    });
    return () => { active = false; };
  }, [accessToken, activity.registered, activity.liked, myProfile?.accountId, setNotice]);

  useEffect(() => {
    const accountId = myProfile?.accountId;
    if (!accountId) return;
    if (localStorage.getItem(recentMigrationKey(accountId)) !== "done"
      || localStorage.getItem(placeMigrationKey(accountId)) !== "done") return;
    LEGACY_ACTIVITY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
  }, [myProfile?.accountId]);

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
      getPlace(route.id, accessToken)
        .then((place) => {
          if (active) setDetail(place);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [route.screen, route.id, accessToken]);

  const legacyDataStillLocal = !myProfile?.accountId || !localStorage.getItem(placeMigrationKey(myProfile.accountId));
  const legacyRegistered = (legacyDataStillLocal ? activity.registered : [])
    .filter((place) => place.visibility !== "private")
    .map(registeredPlace);
  const legacyPrivate = (legacyDataStillLocal ? activity.registered : [])
    .filter((place) => place.visibility === "private")
    .map(registeredPlace);
  // 아직 서버로 옮기지 못한 이전 브라우저 등록 기록입니다. 상세 화면에서 내 기록으로 보여줍니다.
  const own = activity.registered.find((place) => place.id === route.id);
  // 추천 취향에서 제외한 매장 조건(예: 노키즈존)이 있는 장소는 목록과 지도에서 뺍니다.
  const excludedConditions = new Set(myProfile?.excludedTags ?? []);
  /**
   * 장소 기록의 작성자 정보에는 예전 샘플 이름이나 사진이 남아 있을 수 있으므로,
   * 화면에 보이는 이름·사진·배경은 커뮤니티 프로필을 기준으로 맞춥니다. 내 기록은 tasterId를 "me"로 바꿉니다.
   */
  function enrichPlace(place: Place): Place {
    return {
      ...place,
      tasters: place.tasters.map((author) => {
        if (isMyTasterId(author.tasterId)) return {
          ...author,
          tasterId: "me",
          tasterName: myProfile?.nickname ?? displayName,
          avatar: myProfile?.profileImgUrl ?? "",
          avatarVariant: myProfile?.avatarVariant ?? author.avatarVariant,
        };
        const profile = communityTasters.find((taster) => taster.tasterId === author.tasterId);
        return profile ? { ...author, ...profile, tag: author.tag, note: author.note,
          menus: author.menus, photos: author.photos, tags: author.tags,
          tagGroups: author.tagGroups,
          visitConditions: author.visitConditions, visibility: author.visibility } : author;
      }),
    };
  }
  const allPlaces = [...legacyRegistered, ...places]
    .filter((place) =>
      !(place.visitConditions ?? []).some((condition) => excludedConditions.has(condition)),
    )
    .map(enrichPlace);
  // 구독 화면 확인용 일반 계정이 맛객 추천에 섞이지 않도록 공개 기록 작성자만 맛객으로 취급합니다.
  const publicTasterIds = new Set(
    [...legacyRegistered, ...places].flatMap((place) => place.tasters
      .filter((taster) => taster.visibility !== "PRIVATE")
      .map((taster) => taster.tasterId)),
  );
  const publicCommunityTasters = communityTasters.filter((taster) =>
    publicTasterIds.has(taster.tasterId),
  );
  const profileAccountIds = new Set([
    ...subscriptions.map((subscription) => subscription.targetAccountId),
    ...incomingSubscriptions.map((subscription) => subscription.subscriberAccountId),
  ]);
  const registered = myPlaceRecords.filter((place) =>
    place.tasters.some((taster) => isMyTasterId(taster.tasterId)),
  ).map(enrichPlace);
  const privateRecords = [
    ...registered.filter((place) => place.tasters.some((taster) => taster.visibility === "PRIVATE")),
    ...legacyPrivate,
  ].filter((place) => !query || `${place.name} ${place.address}`.includes(query));
  const allRegistered = [...registered, ...legacyRegistered.map(enrichPlace)];
  const activePlace = detail?.id === route.id
    ? enrichPlace(detail)
    : [...allPlaces, ...privateRecords].find((place) => place.id === route.id) ?? (own ? registeredPlace(own) : undefined);
  const tasterById = new Map(
    allPlaces.flatMap((place) => place.tasters).map((taster) => [taster.tasterId, taster]),
  );
  // 공개 작성자와 현재 구독 관계가 있는 계정은 지도에 장소가 없어도 프로필을 열 수 있습니다.
  communityTasters
    .filter((taster) => publicTasterIds.has(taster.tasterId) || profileAccountIds.has(taster.tasterId))
    .forEach((taster) => tasterById.set(taster.tasterId, taster));
  const tasters: Taster[] = [...tasterById.values()];
  const subscriptionIds = subscriptions.map((subscription) => subscription.targetAccountId);
  const recommendedTasters = publicCommunityTasters
    .filter((taster) =>
      (taster.matchScore ?? 0) > 0 && !subscriptionIds.includes(taster.tasterId),
    )
    .sort((left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0));
  const currentFreeSubscription = subscriptions.find(
    (subscription) => subscription.subscriptionType === "FREE",
  );

  const hasActivePlace = !!activePlace;
  useEffect(() => {
    if (route.screen !== "place" || !hasActivePlace) return;
    let active = true;
    rememberRecentPlace(accessToken, route.id)
      .then(() => getRecentPlaces(accessToken))
      .then((items) => { if (active) setRecentPlaces(items); })
      .catch(() => {
        // 장소 상세 화면은 열람 기록 저장 실패와 관계없이 계속 사용할 수 있습니다.
      });
    return () => { active = false; };
  }, [route.screen, route.id, hasActivePlace, accessToken]);

  useEffect(() => {
    if (route.screen === "notifications") void refreshNotifications(notificationFeed.items.length === 0);
  }, [route.screen, notificationFeed.items.length, refreshNotifications]);

  useEffect(() => {
    if (route.screen !== "notifications") return;
    const passiveUnread = notificationFeed.items.filter((item) =>
      !item.readAt && !(item.targetType === "PLACE" && item.targetId)
        && item.targetType !== "MY_SUBSCRIBERS",
    );
    if (!passiveUnread.length) return;
    const readAt = new Date().toISOString();
    setNotificationFeed((current) => ({
      ...current,
      unreadCount: Math.max(0, current.unreadCount - passiveUnread.length),
      items: current.items.map((item) =>
        !item.readAt && !(item.targetType === "PLACE" && item.targetId)
          && item.targetType !== "MY_SUBSCRIBERS" ? { ...item, readAt } : item,
      ),
    }));
    void markPassiveNotificationsRead(accessToken).catch(() => {
      void refreshNotifications();
    });
  }, [route.screen, notificationFeed.items, accessToken, refreshNotifications]);

  async function toggleLike(id: string) {
    const wasLiked = likedPlaceIds.includes(id);
    if (wasLiked) {
      const placeName = places.find((place) => place.id === id)?.name ?? "이 맛집";
      if (!await confirm({ title: "내 맛집에서 삭제할까요?", message: `‘${placeName}’을 내 맛집 목록에서 삭제할까요?`, confirmLabel: "삭제할게요", tone: "danger" })) return;
    }
    const alreadyRegistered = myPlaceRecords.some((place) => place.id === id
      && place.tasters.some((taster) => isMyTasterId(taster.tasterId)));
    if (!wasLiked && alreadyRegistered) {
      setNotice({ kind: "info", title: "이미 내가 등록한 맛집이에요", message: "내 맛집으로 바꾸려면 맛집 상세에서 ‘내 맛집으로 변경’을 선택해 주세요." });
      return;
    }
    try {
      await setPlaceLiked(accessToken, id, !wasLiked);
      setLikedPlaceIds((current) => wasLiked ? current.filter((item) => item !== id) : [id, ...current]);
      if (wasLiked) setVisitedLikedPlaceIds((current) => current.filter((item) => item !== id));
      setNotice({
        kind: "success",
        title: wasLiked ? "내 맛집에서 삭제했어요" : "내 맛집에 추가했어요",
        message: wasLiked ? "저장해 둔 맛집에서 제외했어요." : "내 맛집에서 다시 볼 수 있어요.",
      });
    } catch (cause) {
      setNotice({ kind: "error", title: "내 맛집을 변경하지 못했어요", message: cause instanceof Error ? cause.message : "잠시 후 다시 시도해 주세요." });
    }
  }
  /** 기록을 저장하고 저장된 장소를 돌려줍니다. stayOnScreen이면 새 기록 저장 뒤 상세로 옮기지 않고 호출한 화면이 완료 화면을 그립니다. */
  async function register(place: NewPlace, convertFromPlaceId?: string, visitedConfirmed = false, stayOnScreen = false): Promise<Place> {
    // 등록 화면 주소에 기록 ID가 있으면(#register/<id>) 기존 기록 수정입니다.
    const editing = route.screen === "register" && !!route.id;
    try {
      if (convertFromPlaceId && !visitedConfirmed) {
        throw new Error("직접 방문을 확인한 뒤 등록해 주세요.");
      }
      const created = convertFromPlaceId
        ? await convertLikedPlaceToRecord(accessToken, convertFromPlaceId, place)
        : await createPlaceRecord(accessToken, place);
      // 수정은 새 알림을 만들지 않으므로 알림 저장 실패로 보지 않습니다.
      let notificationSaved = editing;
      if (!editing) {
        try {
          const notification = await createPlaceRegisteredNotification(accessToken, created.id);
          notificationSaved = true;
          setNotificationFeed((current) => {
            const alreadyListed = current.items.some((item) => item.notificationId === notification.notificationId);
            return {
              items: [notification, ...current.items.filter((item) => item.notificationId !== notification.notificationId)],
              unreadCount: current.unreadCount + (!alreadyListed && !notification.readAt ? 1 : 0),
            };
          });
          setNotificationError("");
        } catch {
          notificationSaved = false;
        }
      }
      if (convertFromPlaceId) {
        setLikedPlaceIds((current) => current.filter((item) => item !== convertFromPlaceId));
        setVisitedLikedPlaceIds((current) => current.filter((item) => item !== convertFromPlaceId));
      }
      setMyPlaceRecords((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      if (place.visibility === "public") setPlaces((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setDetail(created);
      if (editing) setRetry((current) => current + 1);
      const stay = stayOnScreen && !editing;
      if (!stay) {
        // 등록 완료 상세에서 뒤로 가면 등록 폼 대신 지도로 돌아가도록 경로를 정리합니다.
        go("map", "", true);
        go("place", created.id);
      }
      if (!stay || !notificationSaved) setNotice(notificationSaved
        ? { kind: "success", title: editing ? "맛집 내용을 수정했어요" : "맛집을 등록했어요", message: editing ? "변경한 내용을 저장했어요." : "맛객 기록과 알림을 저장했어요." }
        : { kind: "error", title: "맛집은 등록했지만 알림 저장에 실패했어요", message: "맛집 기록은 저장됐어요. 알림함에는 다시 표시되지 않을 수 있어요." });
      return created;
    } catch (cause) {
      setNotice({ kind: "error", title: editing ? "맛집 내용을 수정하지 못했어요" : "맛집을 등록하지 못했어요", message: cause instanceof Error ? cause.message : "잠시 후 다시 시도해 주세요." });
      throw cause;
    }
  }
  /** 하트로 저장한 맛집을 방문 기록으로 바꾸도록 등록 화면에 장소를 넘깁니다. 카카오 장소 ID가 없으면 이름으로 다시 검색하게 합니다. */
  function startRecordConversion(place: Place) {
    sessionStorage.setItem(LIKE_CONVERSION_HANDOFF_KEY, JSON.stringify({ sourcePlaceId: place.id, place: kakaoPlaceFromPlace(place), searchName: place.name }));
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
      setPlaces((current) => current.map((item) => item.id === place.id ? withoutMyRecord(item) : item));
      setLikedPlaceIds((current) => current.includes(place.id) ? current : [place.id, ...current]);
      setVisitedLikedPlaceIds((current) => current.includes(place.id) ? current : [place.id, ...current]);
      setDetail(withoutMyRecord(place));
      // 변경은 서버에서 이미 완료됐으므로, 새 목록 조회가 잠시 실패해도 성공 상태를 유지합니다.
      const refreshes = await Promise.allSettled([
        getMyPlaceRecords(accessToken), getPlaces(query.trim(), accessToken), getLikedPlaceIds(accessToken), getPlace(place.id, accessToken), getVisitedLikedPlaceIds(accessToken),
      ]);
      if (refreshes[0].status === "fulfilled") setMyPlaceRecords(refreshes[0].value);
      if (refreshes[1].status === "fulfilled") setPlaces(refreshes[1].value);
      if (refreshes[2].status === "fulfilled") setLikedPlaceIds(refreshes[2].value);
      if (refreshes[3].status === "fulfilled") setDetail(refreshes[3].value);
      // The record-to-like conversion itself is proof of a prior visit. Keep that marker if
      // a concurrent/stale refresh responds before the committed VISITED like is visible.
      if (refreshes[4].status === "fulfilled") {
        const refreshedVisitedPlaceIds = refreshes[4].value;
        setVisitedLikedPlaceIds((current) =>
          [...new Set([...current, ...refreshedVisitedPlaceIds, place.id])],
        );
      }
      setNotice({ kind: "success", title: "내 맛집으로 변경했어요", message: "직접 작성한 기록을 삭제하고 내 맛집에 저장했어요." });
    } catch (cause) {
      setNotice({ kind: "error", title: "내 맛집으로 변경하지 못했어요", message: cause instanceof Error ? cause.message : "잠시 후 다시 시도해 주세요." });
    }
  }
  /** 목록 타일에는 내가 올린 사진을 우선 보여줍니다. 없으면 타일이 기본 이미지를 고릅니다. */
  function photoFor(id: string) {
    return activity.registered.find((place) => place.id === id)?.photos[0]
      ?? [...allPlaces, ...privateRecords, ...myPlaceRecords]
        .find((place) => place.id === id)?.tasters
        .find((taster) => isMyTasterId(taster.tasterId))?.photos?.[0];
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
  /** 맛객 프로필과 구독 목록의 구독 취소가 같은 안내와 새로고침을 쓰도록 한곳에서 처리합니다. */
  async function cancelSubscriptionById(subscriptionId: string) {
    try {
      await cancelSubscription(accessToken, subscriptionId);
      setSubscriptions(await getSubscriptions(accessToken));
      setNotice({ kind: "success", title: "구독을 취소했어요", message: "언제든 다시 구독할 수 있어요." });
    } catch (cause) {
      setNotice({ kind: "error", title: "구독을 취소하지 못했어요", message: cause instanceof Error ? cause.message : "잠시 후 다시 시도해 주세요." });
    }
  }
  async function cancelTasterSubscription(tasterId: string) {
    const subscription = subscriptions.find((item) => item.targetAccountId === tasterId);
    if (subscription) await cancelSubscriptionById(subscription.subscriptionId);
  }
  /** 수정할 내 기록(#register/<id>)을 서버 기록과 아직 옮기지 못한 브라우저 기록에서 찾습니다. */
  const editablePlace = (id: string) =>
    [...allRegistered, ...legacyPrivate.map(enrichPlace)].find((place) => place.id === id);
  const runNotificationUpdate = (request: Promise<unknown>, failureTitle: string) => {
    void request
      .then(() => refreshNotifications())
      .catch((cause: Error) => setNotice({ kind: "error", title: failureTitle, message: cause.message }));
  };
  const appData: AppData = {
    accessToken,
    displayName,
    myProfile,
    nickname: myProfile?.nickname ?? displayName,
    accountRole: accountRole(accessToken, registered.some((place) =>
      place.tasters.some((taster) => taster.visibility === "PUBLIC"),
    )),
    places: allPlaces,
    privatePlaces: privateRecords,
    myRecords: allRegistered,
    recentPlaces: recentPlaces.map(enrichPlace),
    likedPlaceIds,
    visitedLikedPlaceIds,
    activePlace,
    legacyOwnRecord: own,
    editablePlace,
    subscriptions,
    subscriptionIds,
    currentFreeSubscription,
    incomingSubscriptions,
    points,
    tasters,
    tasterById,
    recommendedTasters,
    tasteTags,
    notificationFeed,
    notificationLoading,
    notificationError,
    unread: notificationFeed.unreadCount > 0,
    loading,
    error,
    query,
    setQuery,
    isMyTasterId,
    photoFor,
    actions: {
      retry: () => setRetry((current) => current + 1),
      notify: setNotice,
      toggleLike,
      openSubscription,
      cancelSubscriptionById,
      cancelTasterSubscription,
      register,
      startRecordConversion,
      convertRecordToLike,
      refreshCommunity,
      refreshNotifications,
      markNotificationRead: (item: UserNotification) => {
        if (!item.readAt) runNotificationUpdate(markNotificationRead(accessToken, item.notificationId), "알림을 읽음 처리하지 못했어요");
      },
      markAllNotificationsRead: () => runNotificationUpdate(markAllNotificationsRead(accessToken), "알림을 읽음 처리하지 못했어요"),
      deleteNotification: (id: string) => runNotificationUpdate(deleteNotification(accessToken, id), "알림을 삭제하지 못했어요"),
      deleteAllNotifications: async () => {
        const accepted = await confirm({
          title: "알림을 모두 삭제할까요?",
          message: "삭제한 알림은 다시 확인할 수 없어요.",
          tone: "danger",
          confirmLabel: "모두 삭제",
        });
        if (!accepted) return;
        try {
          await deleteAllNotifications(accessToken);
          setNotificationFeed({ items: [], unreadCount: 0 });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : "알림을 삭제하지 못했어요.";
          setNotice({ kind: "error", title: "알림을 모두 삭제하지 못했어요", message });
        }
      },
      requestTag,
      loadTagRequests,
      logout: onLogout,
    },
  };

  // 하단 탭은 발견·피드·맛객·나 첫 화면에서만 보이고, 나머지 화면은 각자 상단 바의 뒤로 버튼을 씁니다.
  const activeTab = tabForScreen(route.screen);
  let screen;
  if (route.screen === "home" || route.screen === "map") screen = <DiscoverScreen />;
  else if (route.screen === "feed") screen = <FeedScreen />;
  else if (route.screen === "register") screen = <RecordScreen />;
  else if (route.screen === "place") screen = <PlaceDetailScreen />;
  else if (route.screen === "profile") screen = <TasterProfileScreen />;
  else if (route.screen === "tasters" || route.screen === "taster-recommendations") screen = <TastersScreen />;
  else if (route.screen === "subscriptions") screen = <SubscriptionsManageScreen />;
  else if (route.screen === "my") screen = <MeScreen />;
  else if (route.screen === "diary") screen = <DiaryScreen />;
  else if (route.screen === "wallet") screen = <WalletScreen />;
  else if (route.screen === "notifications") screen = <NotificationsScreen />;
  else if (route.screen === "settings") screen = <AccountSettingsScreen />;
  else if (route.screen === "intro") screen = <OnboardingScreen />;
  else if (route.screen === "profile-edit")
    screen = myProfile ? (
      <ProfileSettingsScreen
        profile={myProfile}
        options={tasteTags}
        onRequestTag={requestTag}
        onLoadTagRequests={loadTagRequests}
        key={route.id === "taste" ? "taste" : "profile"}
        initialTab={route.id === "taste" ? "taste" : "profile"}
        onSave={async (changes) => {
          const savedProfile = await updateMyProfile(accessToken, {
            nickname: changes.nickname,
            intro: changes.intro,
            profileTags: changes.profileTags,
            preferenceTags: changes.preferenceTags,
            excludedTags: changes.excludedTags,
            tasterFocus: changes.tasterFocus,
            preferenceFocus: changes.preferenceFocus,
            activityScope: changes.activityScope,
            activityRegion: changes.activityRegion,
          });
          if (changes.avatarFile) await uploadProfileImage(accessToken, changes.avatarFile);
          else if (changes.removeAvatar) await removeProfileImage(accessToken, "avatar");
          if (changes.removeCover) await removeProfileImage(accessToken, "cover");
          else {
            for (const photoId of changes.removedCoverPhotoIds) {
              await removeProfileCoverPhoto(accessToken, photoId);
            }
          }
          const savedCoverUrls = changes.coverFiles?.length ? await uploadProfileCovers(accessToken, changes.coverFiles) : undefined;
          const remainingCoverUrls = changes.removeCover
            ? []
            : (savedProfile.profileCoverUrls ?? []).filter((url) => !changes.removedCoverPhotoIds.some((photoId) => url.includes(`/covers/${photoId}`)));
          const updatedCoverUrls = savedCoverUrls ?? remainingCoverUrls;
          // 부가 맛객 목록을 새로 읽지 못해도 저장된 프로필은 화면 상태에 즉시 반영합니다.
          setMyProfile({
            ...savedProfile,
            profileImgUrl: changes.removeAvatar ? null : changes.avatarFile ? `/media/profiles/${savedProfile.accountId}/avatar` : savedProfile.profileImgUrl,
            profileCoverUrl: updatedCoverUrls.length ? savedProfile.profileCoverUrl : null,
            profileCoverUrls: updatedCoverUrls,
          });
          let refreshFailed = false;
          try { await refreshCommunity(); } catch { refreshFailed = true; }
          setNotice({ kind: "success", title: "변경 내용을 저장했어요", message: refreshFailed ? "프로필과 취향은 저장됐어요. 다른 화면 정보는 잠시 후 다시 불러와요." : "프로필과 추천 취향에 반영했어요." });
        }}
        onError={(message) => setNotice({ kind: "error", title: "프로필을 저장하지 못했어요", message })}
      />
    ) : (
      <div className="empty-state"><p>프로필을 불러오고 있어요…</p></div>
    );
  else screen = <CollectionsScreen />;

  return (
    <AppDataContext.Provider value={appData}>
      <div className={`app-view ${activeTab ? "has-tabbar" : ""}`}>
        <div className="screen-content" key={route.screen}>
          {screen}
        </div>
        {activeTab && <TabBar active={activeTab} accessToken={accessToken} />}
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
            currentFreeTasterId={currentFreeSubscription?.targetAccountId}
            currentFreeName={currentFreeSubscription?.targetNickname}
            currentFreeTaster={tasters.find((taster) => taster.tasterId === currentFreeSubscription?.targetAccountId)}
            onClose={() => setSubscriptionTarget(null)}
            onComplete={({ replacedFreeNickname, isFree, termMonths }) => {
              const subscribedName = subscriptionTarget.tasterName;
              setSubscriptionTarget(null);
              void refreshCommunity().catch((cause: Error) =>
                setNotice({ kind: "error", title: "구독 정보를 새로고침하지 못했어요", message: cause.message }),
              );
              setNotice({
                kind: "success",
                title: isFree ? "무료 구독을 시작했어요" : "구독이 시작됐어요",
                message: isFree
                  ? replacedFreeNickname
                    ? `${replacedFreeNickname} 무료 구독이 종료되고 ${subscribedName} 구독으로 바뀌었어요.`
                    : `${subscribedName}의 맛집 소식을 받아볼 수 있어요.`
                  : `${subscribedName} 맛객의 기록을 ${termMonths}개월 동안 이용할 수 있어요.`,
              });
            }}
          />
        )}
      </div>
    </AppDataContext.Provider>
  );
}
