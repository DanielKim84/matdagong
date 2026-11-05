/** 커뮤니티 서비스(맛객·취향 태그·프로필·구독·포인트·알림) API 요청입니다. */
import type {
  ActiveSubscription,
  ActivityScope,
  FoodFocus,
  IncomingSubscription,
  MyProfile,
  NotificationFeed,
  NotificationSettings,
  PlanCatalog,
  PointAccount,
  ProfileChanges,
  SubscribeResult,
  TagRequest,
  TagRequestInput,
  TasteTag,
  TasterReportReason,
  UserNotification,
} from "../models/community";
import type { Taster } from "../models/place";
import type { TrustLevel } from "../models/trust";
import { avatarVariantFor, demoTasterAvatar } from "../utils/profileMedia";
import { API_BASE_URL, apiRequest, type ApiRequestOptions } from "./http";

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
  trustScore?: number | null;
  trustLevel?: TrustLevel | null;
};

/** 커뮤니티 API도 공통 요청 도구를 거쳐 로그인 만료, 204 응답, 오류 메시지를 같게 처리합니다. */
function request<T>(path: string, accessToken: string, init: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(`${API_BASE_URL}/v1${path}`, accessToken, {
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
    trustScore: taster.trustScore ?? null,
    trustLevel: taster.trustLevel ?? null,
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

/** 맛다공 탈퇴: 커뮤니티 서비스의 내 프로필·취향·구독·알림·포인트 내역을 모두 지웁니다. */
export function deleteMyCommunityData(accessToken: string): Promise<void> {
  return request("/users/me", accessToken, { method: "DELETE", errorMessage: "내 프로필 정보를 지우지 못했어요." });
}

export function ensureMyProfile(accessToken: string, nickname: string): Promise<MyProfile> {
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
async function uploadProfileImage(accessToken: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  await request<void>("/users/me/profile/avatar", accessToken, {
    method: "PUT",
    body: form,
    errorMessage: "프로필 이미지를 저장하지 못했어요.",
  });
}

/** 배경 사진 여러 장을 기존 갤러리에 추가하고, 저장된 배경 사진 주소 목록을 돌려줍니다. */
async function uploadProfileCovers(accessToken: string, files: File[]): Promise<string[]> {
  const form = new FormData();
  files.forEach((file) => form.append("files", file));
  const urls = await request<string[] | undefined>("/users/me/profile/covers", accessToken, {
    method: "POST",
    body: form,
    errorMessage: "배경 사진을 저장하지 못했어요.",
  });
  return urls ?? [];
}

async function removeProfileImage(accessToken: string, kind: "avatar" | "cover"): Promise<void> {
  await request<void>(`/users/me/profile/${kind}`, accessToken, {
    method: "DELETE",
    errorMessage: "프로필 이미지를 삭제하지 못했어요.",
  });
}

async function removeProfileCoverPhoto(accessToken: string, photoId: string): Promise<void> {
  await request<void>(`/users/me/profile/covers/${encodeURIComponent(photoId)}`, accessToken, {
    method: "DELETE",
    errorMessage: "배경 사진을 삭제하지 못했어요.",
  });
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
 * 프로필 설정 화면의 변경 내용을 순서대로 저장하고, 화면 상태에 바로 쓸 프로필을 돌려줍니다.
 * 사진 업로드 응답에는 프로필 전체가 없으므로 바뀐 사진 주소만 직접 맞춥니다.
 */
export async function saveMyProfile(accessToken: string, changes: ProfileChanges): Promise<MyProfile> {
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
  const savedCoverUrls = changes.coverFiles?.length
    ? await uploadProfileCovers(accessToken, changes.coverFiles)
    : undefined;
  const remainingCoverUrls = changes.removeCover
    ? []
    : (savedProfile.profileCoverUrls ?? []).filter(
        (url) => !changes.removedCoverPhotoIds.some((photoId) => url.includes(`/covers/${photoId}`)),
      );
  const updatedCoverUrls = savedCoverUrls ?? remainingCoverUrls;
  return {
    ...savedProfile,
    profileImgUrl: changes.removeAvatar
      ? null
      : changes.avatarFile
        ? `/media/profiles/${savedProfile.accountId}/avatar`
        : savedProfile.profileImgUrl,
    profileCoverUrl: updatedCoverUrls.length ? savedProfile.profileCoverUrl : null,
    profileCoverUrls: updatedCoverUrls,
  };
}

/**
 * 맛객을 신고합니다. 기록에서 신고했으면 그 장소 ID(placeId)를 함께 보냅니다.
 * 확인 전인 신고가 이미 있으면 409(ApiError)로 답합니다.
 */
export function reportTaster(
  accessToken: string,
  tasterId: string,
  reason: TasterReportReason,
  memo: string,
  placeId?: string,
): Promise<{ reportId: string }> {
  return request(`/tasters/${encodeURIComponent(tasterId)}/reports`, accessToken, {
    method: "POST",
    body: JSON.stringify({ reason, memo: memo.trim() || null, placeId: placeId ?? null }),
    errorMessage: "신고를 보내지 못했어요.",
  });
}

/** 내가 신고했고 아직 확인 전인 맛객 ID입니다. 이 맛객의 신고 버튼은 막습니다. */
export function getMyReportedTasters(accessToken: string): Promise<string[]> {
  return request("/users/me/taster-reports", accessToken, { errorMessage: "신고 내역을 불러오지 못했어요." });
}
