import type { Taster } from "../models/place";
import { avatarVariantFor, demoTasterAvatar } from "../utils/profileMedia";
import { apiRequest, type ApiRequestOptions } from "./http";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

export type PaidPlan = { termMonths: number; priceAmount: number };
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
export type PointEntry = {
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

export type MyProfile = {
  accountId: string;
  nickname: string;
  profileImgUrl: string | null;
  avatarVariant: number;
  profileCoverUrl: string | null;
  profileCoverUrls: string[];
  tasterFocus: FoodFocus;
  preferenceFocus: FoodFocus;
  activityScope: ActivityScope;
  activityRegion: string | null;
  intro: string | null;
  profileTags: string[];
  preferenceTags: string[];
  excludedTags: string[];
};

export type FoodFocus = "RESTAURANT" | "CAFE_DESSERT" | "BOTH";
export type ActivityScope = "LOCAL" | "TRAVEL" | "BOTH";
export type TasteTag = {
  name: string;
  category: "MENU" | "VISIT";
  tagGroup: "CUISINE" | "TASTE" | "CAFE" | "OCCASION" | "VISIT";
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
  tagCategory: TasteTag["category"];
  tagGroup: TasteTag["tagGroup"];
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

type TasterResponse = {
  tasterId: string;
  tasterName: string;
  tag: string;
  avatar: string | null;
  avatarVariant: number;
  profileCoverUrl: string | null;
  profileCoverUrls?: string[];
  tasterFocus: FoodFocus;
  activityScope: ActivityScope;
  activityRegion: string | null;
  note: string;
  intro: string | null;
  subscriberCount: number;
  profileTags: string[];
  matchedTags: string[];
  matchScore: number;
};

/** 커뮤니티 API도 공통 요청 도구를 거쳐 로그인 만료, 204 응답, 오류 메시지를 같게 처리합니다. */
function request<T>(
  path: string,
  accessToken: string,
  init: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(`${baseUrl}/v1${path}`, accessToken, {
    errorMessage: "요청을 처리하지 못했어요.",
    ...init,
  });
}

export async function getTasters(accessToken: string): Promise<Taster[]> {
  const response = await request<TasterResponse[]>("/tasters", accessToken);
  return response.map((taster) => ({
    tasterId: taster.tasterId,
    tasterName: taster.tasterName,
    tag: taster.profileTags.length ? taster.profileTags.join(" · ") : taster.tag,
    avatar: taster.avatar ?? demoTasterAvatar(taster.tasterId) ?? "",
    avatarVariant: avatarVariantFor(taster.tasterId, taster.avatarVariant),
    profileCoverUrl: taster.profileCoverUrl,
    profileCoverUrls: taster.profileCoverUrls ?? (taster.profileCoverUrl ? [taster.profileCoverUrl] : []),
    tasterFocus: taster.tasterFocus,
    activityScope: taster.activityScope,
    activityRegion: taster.activityRegion,
    note: taster.note,
    intro: taster.intro ?? "맛있는 장소를 찾아 기록하고 있어요.",
    subscriberCount: taster.subscriberCount,
    profileTags: taster.profileTags,
    matchedTags: taster.matchedTags,
    matchScore: taster.matchScore,
  }));
}

export function getTasteTags(accessToken: string): Promise<TasteTag[]> {
  return request("/taste-tags", accessToken);
}

export function getMyTagRequests(accessToken: string): Promise<TagRequest[]> {
  return request("/taste-tags/requests/mine", accessToken);
}

export function createTagRequest(accessToken: string, input: TagRequestInput): Promise<TagRequest> {
  return request("/taste-tags/requests", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function ensureMyProfile(
  accessToken: string,
  nickname: string,
): Promise<MyProfile> {
  return request("/users/me/profile", accessToken, {
    method: "POST",
    body: JSON.stringify({ nickname }),
  });
}

export function updateMyProfile(
  accessToken: string,
  profile: {
    nickname: string;
    intro: string;
    profileTags: string[];
    preferenceTags: string[];
    excludedTags: string[];
    tasterFocus: FoodFocus;
    preferenceFocus: FoodFocus;
    activityScope: ActivityScope;
    activityRegion: string;
  },
): Promise<MyProfile> {
  return request("/users/me/profile", accessToken, {
    method: "PUT",
    body: JSON.stringify(profile),
  });
}

/** 프로필 사진 한 장을 교체합니다. */
export async function uploadProfileImage(accessToken: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  await request<void>("/users/me/profile/avatar", accessToken, {
    method: "PUT",
    body: form,
    errorMessage: "프로필 이미지를 저장하지 못했어요.",
  });
}

/** 배경 사진 여러 장을 기존 갤러리에 추가하고, 저장된 배경 사진 주소 목록을 돌려줍니다. */
export async function uploadProfileCovers(accessToken: string, files: File[]): Promise<string[]> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const urls = await request<string[] | undefined>("/users/me/profile/covers", accessToken, {
    method: "POST", body: form, errorMessage: "배경 사진을 저장하지 못했어요.",
  });
  return urls ?? [];
}

export async function removeProfileImage(
  accessToken: string,
  kind: "avatar" | "cover",
): Promise<void> {
  await request<void>(`/users/me/profile/${kind}`, accessToken, {
    method: "DELETE",
    errorMessage: "프로필 이미지를 삭제하지 못했어요.",
  });
}

export async function removeProfileCoverPhoto(accessToken: string, photoId: string): Promise<void> {
  await request<void>(`/users/me/profile/covers/${encodeURIComponent(photoId)}`, accessToken, {
    method: "DELETE",
    errorMessage: "배경 사진을 삭제하지 못했어요.",
  });
}

export function getPlanCatalog(accessToken: string): Promise<PlanCatalog> {
  return request("/subscriptions/plans", accessToken);
}

export function getSubscriptions(
  accessToken: string,
): Promise<ActiveSubscription[]> {
  return request("/subscriptions", accessToken);
}

export async function cancelSubscription(accessToken: string, subscriptionId: string): Promise<void> {
  await request<void>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, accessToken, {
    method: "DELETE",
    errorMessage: "구독을 취소하지 못했어요.",
  });
}

export function getIncomingSubscriptions(accessToken: string): Promise<IncomingSubscription[]> {
  return request("/subscriptions/subscribers", accessToken);
}

export function getPoints(accessToken: string): Promise<PointAccount> {
  return request("/points", accessToken);
}

export function createSubscription(
  accessToken: string,
  targetAccountId: string,
  subscriptionType: "FREE" | "PAID",
  termMonths: number | null,
  confirmFreeReplacement = false,
): Promise<SubscribeResult> {
  return request("/subscriptions", accessToken, {
    method: "POST",
    body: JSON.stringify({ targetAccountId, subscriptionType, termMonths, confirmFreeReplacement }),
  });
}

export function getNotifications(accessToken: string): Promise<NotificationFeed> {
  return request("/notifications", accessToken);
}

export function createPlaceRegisteredNotification(
  accessToken: string,
  placeId: string,
): Promise<UserNotification> {
  // 장소 이름과 공개 여부는 서버가 저장된 기록에서 확인합니다.
  return request("/notifications/place-recorded", accessToken, {
    method: "POST",
    body: JSON.stringify({ placeId }),
  });
}

async function updateNotification(accessToken: string, path: string, method: "PUT" | "DELETE"): Promise<void> {
  await request<void>(path, accessToken, { method, errorMessage: "알림을 변경하지 못했어요." });
}

export function markNotificationRead(accessToken: string, id: string): Promise<void> {
  return updateNotification(accessToken, `/notifications/${id}/read`, "PUT");
}

export function markAllNotificationsRead(accessToken: string): Promise<void> {
  return updateNotification(accessToken, "/notifications/read-all", "PUT");
}

export function markPassiveNotificationsRead(accessToken: string): Promise<void> {
  return updateNotification(accessToken, "/notifications/read-passive", "PUT");
}

export function deleteNotification(accessToken: string, id: string): Promise<void> {
  return updateNotification(accessToken, `/notifications/${id}`, "DELETE");
}

export function deleteAllNotifications(accessToken: string): Promise<void> {
  return updateNotification(accessToken, "/notifications/all", "DELETE");
}
