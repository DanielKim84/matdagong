import { createContext, useContext } from "react";
import type { NewPlace, Place, Taster } from "../models/place";
import type {
  ActiveSubscription,
  IncomingSubscription,
  MyProfile,
  NotificationFeed,
  PointAccount,
  TagRequestInput,
  TasteTag,
  UserNotification,
} from "../services/community";
import type { NoticeKind } from "../components/NoticeToast";

export type AppNotice = { kind: NoticeKind; title: string; message: string };
export type AccountRole = "ADMIN" | "SUPER_TASTER" | "TASTER" | "USER";

/**
 * 화면들이 함께 쓰는 앱 데이터와 동작입니다. App이 서버에서 불러온 상태를 모아 넘기고,
 * 각 화면은 props를 늘리지 않고 useAppData()로 필요한 것만 꺼내 씁니다.
 */
export type AppData = {
  accessToken: string;
  /** 공통 계정 가입 때 받은 이름. 맛객 프로필이 없을 때 대신 씁니다. */
  displayName: string;
  myProfile: MyProfile | null;
  /** 화면에 보일 내 이름(맛객 닉네임 우선) */
  nickname: string;
  accountRole: AccountRole;

  /** 지도·목록에 보일 공개 장소(취향에서 제외한 조건은 빠짐). 작성자 정보는 커뮤니티 프로필로 맞춰져 있습니다. */
  places: Place[];
  /** 내 비공개 기록 장소 */
  privatePlaces: Place[];
  /** 내가 기록한 장소(공개·비공개) */
  myRecords: Place[];
  recentPlaces: Place[];
  likedPlaceIds: string[];
  /** 직접 방문 기록에서 내 맛집으로 옮긴 장소(다시 기록으로 바꿀 수 있음) */
  visitedLikedPlaceIds: string[];
  /** 지금 보고 있는 맛집 상세(#place/<id>)의 장소. 없으면 불러오는 중이거나 찾을 수 없음 */
  activePlace?: Place;
  /** 이전 버전이 이 브라우저에만 저장한 내 기록(서버로 옮기기 전). 상세의 내 기록으로 씁니다. */
  legacyOwnRecord?: NewPlace;
  /** 수정할 내 기록(#register/<id>)을 찾습니다. */
  editablePlace: (id: string) => Place | undefined;

  subscriptions: ActiveSubscription[];
  subscriptionIds: string[];
  currentFreeSubscription?: ActiveSubscription;
  incomingSubscriptions: IncomingSubscription[];
  points: PointAccount;

  /** 장소 작성자와 커뮤니티 맛객을 합친 목록 */
  tasters: Taster[];
  tasterById: Map<string, Taster>;
  /** 취향 점수가 있고 아직 구독하지 않은 맛객(점수 높은 순) */
  recommendedTasters: Taster[];
  tasteTags: TasteTag[];

  notificationFeed: NotificationFeed;
  notificationLoading: boolean;
  notificationError: string;
  unread: boolean;

  loading: boolean;
  error: string;
  /** 지도 검색어 */
  query: string;
  setQuery: (query: string) => void;

  isMyTasterId: (tasterId: string) => boolean;
  /** 목록 타일에 쓸 내 사진(있으면) */
  photoFor: (placeId: string) => string | undefined;

  actions: {
    retry: () => void;
    notify: (notice: AppNotice) => void;
    toggleLike: (placeId: string) => Promise<void>;
    openSubscription: (tasterId: string) => void;
    cancelSubscriptionById: (subscriptionId: string) => Promise<void>;
    cancelTasterSubscription: (tasterId: string) => Promise<void>;
    /** 저장된 장소를 돌려줍니다. stayOnScreen이면 새 기록 저장 뒤 상세로 이동하지 않습니다. */
    register: (place: NewPlace, convertFromPlaceId?: string, visitedConfirmed?: boolean, stayOnScreen?: boolean) => Promise<Place>;
    startRecordConversion: (place: Place) => void;
    convertRecordToLike: (place: Place) => Promise<void>;
    refreshCommunity: () => Promise<void>;
    refreshNotifications: (showLoading?: boolean) => Promise<NotificationFeed | null>;
    markNotificationRead: (item: UserNotification) => void;
    markAllNotificationsRead: () => void;
    deleteNotification: (notificationId: string) => void;
    deleteAllNotifications: () => Promise<void>;
    requestTag: (input: TagRequestInput) => ReturnType<typeof import("../services/community").createTagRequest>;
    loadTagRequests: () => ReturnType<typeof import("../services/community").getMyTagRequests>;
    logout: () => void;
  };
};

export const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData는 App 안에서만 쓸 수 있어요.");
  return value;
}
