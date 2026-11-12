/** 커뮤니티(프로필·취향 태그·구독·포인트·알림·신고) 자료형입니다. 서버 JSON 필드 이름을 그대로 씁니다. */

/**
 * 맛객 닉네임 최대 글자 수입니다. 커뮤니티 서버 ProfileModels.MAX_NICKNAME_LENGTH(검증과 자동 닉네임 접미사 자르기)와
 * 같은 값입니다.
 */
export const MAX_NICKNAME_LENGTH = 12;

type PaidPlan = { termMonths: number; priceAmount: number };
/** 구독 요금표입니다. testMode면 결제 연동 전이라 유료 플랜도 0원으로 열고 요금은 안내로만 보여 줍니다. */
export type PlanCatalog = {
  testMode: boolean;
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
/** 구독 신청 결과입니다. 새 구독 내용은 신청 뒤 구독 목록을 다시 받아 씁니다. */
export type SubscribeResult = {
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
/** 포인트 원장 한 줄입니다. 적립·사용은 amount 부호로 구분합니다. */
type PointEntry = {
  historyId: string;
  title: string;
  memo: string | null;
  amount: number;
  createdAt: string;
};
export type PointAccount = { balance: number; history: PointEntry[] };
export type UserNotification = {
  /** 알림 종류입니다. 커뮤니티 서비스 NotificationType, DB ck_user_notifications_type과 같은 값입니다. */
  notificationType: "PLACE_RECORD_CREATED" | "TASTER_NEW_PLACE" | "NEW_SUBSCRIBER" | "SYSTEM_NOTICE";
  notificationId: string;
  title: string;
  message: string;
  /**
   * 눌렀을 때 이동할 곳(PLACE: 장소 상세, MY_SUBSCRIBERS: 내 구독자). 커뮤니티 서비스 NotificationService의 대상 상수,
   * DB ck_user_notifications_target_type과 같은 값입니다. 대상 종류와 ID는 늘 함께 있거나 함께 비어 있습니다.
   */
  targetType: "PLACE" | "MY_SUBSCRIBERS" | null;
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
  hiddenByReports: boolean;
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

/** 태그·매장 이용 정보 제안입니다. 길이 한도는 TasteTagRequestSheet와 커뮤니티 서비스 TasteTagModels.TagRequest가 같습니다. */
export type TagRequestInput = {
  requestType: "TAG" | "PLACE_INFO";
  name: string;
  tagGroup: TasteTag["tagGroup"];
  reason: string;
};
/** 내 제안 한 줄입니다. status는 커뮤니티 서비스 TagRequestStatus, DB taste_tag_requests.request_st와 같은 값입니다. */
export type TagRequest = {
  requestType: "TAG" | "PLACE_INFO";
  requestId: string;
  tagName: string;
  tagGroup: TasteTag["tagGroup"];
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
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
