/** 커뮤니티(프로필·취향 태그·구독·포인트·알림) 자료형입니다. 서버 JSON 필드 이름을 그대로 씁니다. */

/** 맛객 닉네임 최대 글자 수입니다. 커뮤니티 서버(ProfileModels)의 검증과 같습니다. */
export const MAX_NICKNAME_LENGTH = 12;

type PaidPlan = { termMonths: number; priceAmount: number };
export type PlanCatalog = {
  currency: "KRW";
  testMode: boolean;
  freePrice: number;
  paidPlans: PaidPlan[];
};
export type ActiveSubscription = {
  subscriptionId: string;
  targetAccountId: string;
  targetNickname: string;
  subscriptionType: "FREE" | "PAID";
  termMonths: number | null;
  startAt: string;
  endAt: string | null;
};
export type SubscribeResult = {
  subscription: ActiveSubscription;
  replacedFreeNickname: string | null;
};
export type IncomingSubscription = {
  subscriptionId: string;
  subscriberAccountId: string;
  subscriberNickname: string;
  avatar: string | null;
  avatarVariant: number;
  subscriptionType: "FREE" | "PAID";
  termMonths: number | null;
  startAt: string;
  endAt: string | null;
};
type PointEntry = {
  historyId: string;
  eventType: "EARN" | "SPEND" | "ADJUST";
  title: string;
  memo: string | null;
  amount: number;
  createdAt: string;
};
export type PointAccount = { balance: number; history: PointEntry[] };
export type UserNotification = {
  notificationId: string;
  notificationType: "PLACE_RECORD_CREATED" | "TASTER_NEW_PLACE" | "NEW_SUBSCRIBER" | "SYSTEM_NOTICE";
  title: string;
  message: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
  readAt: string | null;
};
export type NotificationFeed = { items: UserNotification[]; unreadCount: number };
/** 알림 수신 설정. 본인 맛집 등록 완료 알림은 설정과 관계없이 받습니다. */
export type NotificationSettings = {
  /** 구독 중인 맛객의 새 공개 기록 */
  tasterNewPlace: boolean;
  /** 나를 새로 구독한 사람 */
  newSubscriber: boolean;
  /** 맛다공 소식·이벤트 */
  serviceNews: boolean;
};

export type MyProfile = {
  accountId: string;
  nickname: string;
  profileImgUrl: string | null;
  avatarVariant: number;
  profileCoverUrls: string[];
  tasterFocus: FoodFocus;
  preferenceFocus: FoodFocus;
  activityScope: ActivityScope;
  activityRegion: string | null;
  intro: string | null;
  profileTags: string[];
  preferenceTags: string[];
  excludedTags: string[];
  /** 신고가 쌓여 자동으로 가려졌으면 true. 다른 맛객에게 프로필·기록이 보이지 않고 새 기록을 남길 수 없습니다. */
  hiddenByReports?: boolean;
};

/** 맛객 신고 이유입니다. 커뮤니티 서비스 ReportReason과 같습니다. */
export type TasterReportReason =
  | "ILLEGAL_PHOTO"
  | "ADVERTISING"
  | "ABUSIVE"
  | "DEFAMATION"
  | "IMPERSONATION"
  | "SPAM"
  | "OTHER";

export type FoodFocus = "RESTAURANT" | "CAFE_DESSERT" | "BOTH";
export type ActivityScope = "LOCAL" | "TRAVEL" | "BOTH";
export type TasteTag = {
  name: string;
  /** 태그 분류. 커뮤니티 서비스 TasteTagGroup과 같은 값이며, 순서·이름·한도는 models/tasteTags.ts에 둡니다. */
  tagGroup: "CUISINE" | "TASTE" | "CAFE" | "DESSERT" | "TRAVEL" | "MOOD" | "OCCASION" | "VISIT";
};

export type TagRequestInput = {
  requestType?: "TAG" | "PLACE_INFO";
  name: string;
  tagGroup: TasteTag["tagGroup"];
  reason: string;
};
export type TagRequest = {
  requestType: "TAG" | "PLACE_INFO";
  requestId: string;
  tagName: string;
  tagGroup: TasteTag["tagGroup"];
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

/** 프로필 설정 화면이 저장을 요청할 때 넘기는 변경 내용입니다(사진 파일·삭제 표시 포함). */
export type ProfileChanges = {
  nickname: string;
  intro: string;
  avatarFile?: File;
  coverFiles?: File[];
  removedCoverPhotoIds: string[];
  shouldRemoveAvatar?: boolean;
  profileTags: string[];
  tasterFocus: FoodFocus;
  activityScope: ActivityScope;
  activityRegion: string;
  preferenceFocus: FoodFocus;
  preferenceTags: string[];
  excludedTags: string[];
};
