/** 맛객·취향 태그·구독·포인트·알림 API입니다. 프로필·사진 저장은 profile.ts에서 관리합니다. */
import type {
  ActiveSubscription,
  ActivityScope,
  FoodFocus,
  IncomingSubscription,
  NotificationFeed,
  NotificationSettings,
  PlanCatalog,
  PointAccount,
  SubscribeResult,
  TagRequest,
  TagRequestInput,
  TasteTag,
  TasterReportReason,
  UserNotification,
} from "../models/community";
import type { Taster } from "../models/place";
import type { TrustLevel } from "../models/trust";
import { communityRequest as request } from "./communityRequest";

type TasterResponse = {
  tasterId: string;
  tasterName: string;
  avatar: string | null;
  avatarVariant: number;
  profileCoverUrls: string[];
  tasterFocus: FoodFocus;
  activityScope: ActivityScope;
  activityRegions: string[];
  intro: string | null;
  subscriberCount: number;
  profileTags: string[];
  matchedTags: string[];
  matchScore: number;
  trustScore: number | null;
  trustLevel: TrustLevel | null;
};

export async function getTasters(accessToken: string): Promise<Taster[]> {
  const response = await request<TasterResponse[]>("/tasters", accessToken);
  return response.map((taster) => ({
    tasterId: taster.tasterId,
    tasterName: taster.tasterName,
    avatar: taster.avatar ?? "",
    avatarVariant: taster.avatarVariant,
    profileCoverUrls: taster.profileCoverUrls,
    tasterFocus: taster.tasterFocus,
    activityScope: taster.activityScope,
    activityRegions: taster.activityRegions,
    // note는 장소 기록의 한마디 자리라 커뮤니티 프로필에서는 비워 둡니다.
    note: "",
    // 소개를 비운 맛객은 화면이 tasterData.introOf의 기본 문구를 보여 줍니다.
    intro: taster.intro ?? undefined,
    subscriberCount: taster.subscriberCount,
    profileTags: taster.profileTags,
    matchedTags: taster.matchedTags,
    matchScore: taster.matchScore,
    trustScore: taster.trustScore,
    trustLevel: taster.trustLevel,
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

/** 맛다공 탈퇴: 커뮤니티 서비스의 내 프로필·취향·구독·알림·포인트 내역·태그 제안·내가 한 신고를 모두 지웁니다. */
export function deleteMyCommunityData(accessToken: string): Promise<void> {
  return request("/users/me", accessToken, { method: "DELETE", errorMessage: "내 프로필 정보를 지우지 못했어요." });
}

export function getPlanCatalog(accessToken: string): Promise<PlanCatalog> {
  return request("/subscriptions/plans", accessToken);
}

export function getSubscriptions(accessToken: string): Promise<ActiveSubscription[]> {
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
  isFreeReplacementConfirmed = false,
): Promise<SubscribeResult> {
  return request("/subscriptions", accessToken, {
    method: "POST",
    body: JSON.stringify({
      targetAccountId,
      subscriptionType,
      termMonths,
      confirmFreeReplacement: isFreeReplacementConfirmed,
    }),
  });
}

export function getNotifications(accessToken: string): Promise<NotificationFeed> {
  return request("/notifications", accessToken);
}

export function getNotificationSettings(accessToken: string): Promise<NotificationSettings> {
  return request("/notifications/settings", accessToken);
}

export function updateNotificationSettings(
  accessToken: string,
  settings: NotificationSettings,
): Promise<NotificationSettings> {
  return request("/notifications/settings", accessToken, { method: "PUT", body: JSON.stringify(settings) });
}

export function createPlaceRegisteredNotification(accessToken: string, placeId: string): Promise<UserNotification> {
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
  return updateNotification(accessToken, `/notifications/${encodeURIComponent(id)}/read`, "PUT");
}

export function markAllNotificationsRead(accessToken: string): Promise<void> {
  return updateNotification(accessToken, "/notifications/read-all", "PUT");
}

export function markPassiveNotificationsRead(accessToken: string): Promise<void> {
  return updateNotification(accessToken, "/notifications/read-passive", "PUT");
}

export function deleteNotification(accessToken: string, id: string): Promise<void> {
  return updateNotification(accessToken, `/notifications/${encodeURIComponent(id)}`, "DELETE");
}

export function deleteAllNotifications(accessToken: string): Promise<void> {
  return updateNotification(accessToken, "/notifications/all", "DELETE");
}

/**
 * 맛객을 신고합니다. 기록에서 신고했으면 그 장소 ID(placeId)를 함께 보냅니다. 설명은 꼭 적어야 합니다(화면이 먼저 막음).
 * 확인 전인 신고가 이미 있으면 409(ApiError)로 답합니다.
 */
export async function reportTaster(
  accessToken: string,
  tasterId: string,
  reason: TasterReportReason,
  memo: string,
  placeId?: string,
): Promise<void> {
  await request<void>(`/tasters/${encodeURIComponent(tasterId)}/reports`, accessToken, {
    method: "POST",
    body: JSON.stringify({ reason, memo: memo.trim(), placeId: placeId ?? null }),
    errorMessage: "신고를 보내지 못했어요.",
  });
}

/** 내가 신고했고 아직 확인 전인 맛객 ID입니다. 이 맛객의 신고 버튼은 막습니다. */
export function getMyReportedTasters(accessToken: string): Promise<string[]> {
  return request("/users/me/taster-reports", accessToken, { errorMessage: "신고 내역을 불러오지 못했어요." });
}
