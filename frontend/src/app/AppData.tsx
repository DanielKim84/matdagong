/** 화면들이 useAppData()로 꺼내 쓰는 앱 데이터·동작의 자료형과 Context, 앱 공통 안내 자료형입니다. */
import { createContext, useContext } from "react";
import type {
  ActiveSubscription,
  IncomingSubscription,
  MyProfile,
  NotificationFeed,
  PointAccount,
  ProfileChanges,
  TagRequest,
  TagRequestInput,
  TasteTag,
  TasterReportReason,
  UserNotification,
} from "../models/community";
import type { NewPlace, Place, Taster } from "../models/place";

/** 안내창 종류입니다. 확인창 tone으로 바꿔 띄웁니다(error → danger, 나머지는 같은 이름). */
export type NoticeKind = "info" | "success" | "error";
export type AppNotice = { kind: NoticeKind; title: string; message: string };
/** 서버가 이유를 알려 주지 않은 실패 안내의 기본 문구입니다. */
export const RETRY_LATER_MESSAGE = "잠시 후 다시 시도해 주세요.";
export type AccountRole = "ADMIN" | "SUPER_TASTER" | "TASTER" | "USER";

/**
 * 화면들이 함께 쓰는 앱 데이터와 동작입니다. App이 서버에서 불러온 상태를 모아 넘기고,
 * 각 화면은 props를 늘리지 않고 useAppData()로 필요한 것만 꺼내 씁니다.
 */
export type AppData = {
  accessToken: string;
  /** 공통 계정 가입 때 받은 이름. 맛객 프로필이 없을 때 대신 씁니다. */
  displayName: string;
  /** 로그인에 쓴 소셜 제공자 코드(KAKAO, NAVER). 설정의 연결된 계정에 씁니다. */
  loginProviders: string[];
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
  /** 다녀온 곳(빠른 저장·기록한 적 있는 곳). 기록을 지워도 남아 내 지도의 가본 곳에 보입니다. */
  visitedPlaceIds: string[];
  /** 다녀왔지만 별로였던 곳(하트 아님). 지도에서 빠지고 맛객 신뢰에 반영됩니다. */
  dislikedPlaceIds: string[];
  /**
   * 그 가게에 들른 근거(다녀온 곳, 빠른 저장, 별로였던 곳)가 있는 장소.
   * 이곳은 위치 확인 없이 기록하거나 별로였어요를 고를 수 있습니다.
   */
  visitProofPlaceIds: string[];
  /** 지금 보고 있는 맛집 상세(#place/<id>)의 장소. 없으면 불러오는 중이거나 찾을 수 없음 */
  activePlace?: Place;
  /** 수정할 내 기록(#register/<id>)을 찾습니다. */
  editablePlace: (id: string) => Place | undefined;

  subscriptions: ActiveSubscription[];
  subscriptionIds: string[];
  currentFreeSubscription?: ActiveSubscription;
  incomingSubscriptions: IncomingSubscription[];
  points: PointAccount;
  /** 내가 신고했고 아직 확인 전인 맛객. 이 맛객의 신고 버튼은 "신고했어요"로 막습니다. */
  reportedTasterIds: string[];

  /** 장소 작성자와 커뮤니티 맛객을 합친 목록 */
  tasters: Taster[];
  tasterById: Map<string, Taster>;
  /** 취향 점수나 신뢰 등급이 있고 아직 구독하지 않은 맛객(신뢰 등급 → 신뢰 % → 취향 % 순) */
  recommendedTasters: Taster[];
  tasteTags: TasteTag[];
  /** 구독 시트를 열어 둔 맛객. 없으면 null */
  subscriptionTarget: Taster | null;

  notificationFeed: NotificationFeed;
  isNotificationLoading: boolean;
  notificationError: string;
  hasUnread: boolean;

  /** 공개 장소 목록을 불러오는 중인지와 그 오류 문구 */
  isLoading: boolean;
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
    /** 하트 버튼: 빈 하트는 바로 가볼 곳으로 저장하고, 찬 하트는 고르는 시트를 열어 저장이 끝날 때까지 기다립니다. */
    chooseLike: (placeId: string) => Promise<void>;
    undoDislike: (placeId: string) => Promise<void>;
    /** 카카오에서 검색한 가게를 가볼 곳으로 저장하고 저장된 장소를 돌려줍니다. 실패하면 오류를 던집니다. */
    saveWishPlace: (place: KakaoPlaceResult) => Promise<Place>;
    openSubscription: (tasterId: string) => void;
    closeSubscription: () => void;
    cancelSubscriptionById: (subscriptionId: string) => Promise<void>;
    cancelTasterSubscription: (tasterId: string) => Promise<void>;
    /** 맛객을 신고합니다. 기록에서 신고했으면 placeId를 넘깁니다. 실패하면 오류를 던집니다. */
    reportTaster: (tasterId: string, reason: TasterReportReason, memo: string, placeId?: string) => Promise<void>;
    /** 저장된 장소를 돌려줍니다. 새 기록은 부른 화면이 완료 화면을 그리고, 수정은 저장 뒤 상세로 옮깁니다. */
    register: (place: NewPlace, convertFromPlaceId?: string, isVisitConfirmed?: boolean) => Promise<Place>;
    /** 내 기록의 공개 범위만 바꿉니다. 기록 내용은 그대로 남습니다. */
    changeOwnRecordVisibility: (place: Place, visibility: "PUBLIC" | "PRIVATE") => Promise<void>;
    /** 이 장소의 내 기록을 지웁니다. 지웠으면 true입니다. */
    deleteOwnRecord: (place: Place) => Promise<boolean>;
    refreshCommunity: () => Promise<void>;
    refreshNotifications: (shouldShowLoading?: boolean) => Promise<NotificationFeed | null>;
    markNotificationRead: (item: UserNotification) => void;
    markAllNotificationsRead: () => void;
    deleteNotification: (notificationId: string) => void;
    deleteAllNotifications: () => Promise<void>;
    requestTag: (input: TagRequestInput) => Promise<TagRequest>;
    loadTagRequests: () => Promise<TagRequest[]>;
    /** 프로필 설정을 저장하고 화면 상태와 맛객 목록을 새로 맞춘 뒤 완료 안내를 띄웁니다. 실패하면 오류를 던집니다. */
    saveProfile: (changes: ProfileChanges) => Promise<void>;
    logout: () => void;
  };
};

export const AppDataContext = createContext<AppData | null>(null);

export function useAppData(): AppData {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData는 App 안에서만 쓸 수 있어요.");
  return value;
}
