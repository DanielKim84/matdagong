import type { Taster } from "../models/place";
import { avatarVariantFor, demoTasterAvatar } from "../utils/profileMedia";

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

export type MyProfile = {
  accountId: string;
  nickname: string;
  profileImgUrl: string | null;
  avatarVariant: number;
  profileCoverUrl: string | null;
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
  name: string;
  tagGroup: TasteTag["tagGroup"];
  reason: string;
};
export type TagRequest = {
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

async function responseError(response: Response, fallback: string): Promise<Error> {
  const body = (await response.json().catch(() => null)) as
    | { detail?: string; message?: string }
    | null;
  return new Error(body?.detail ?? body?.message ?? fallback);
}

async function request<T>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${baseUrl}/v1${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw await responseError(response, "요청을 처리하지 못했어요.");
  }
  return response.json() as Promise<T>;
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

export function uploadProfileImage(accessToken: string, file: File): Promise<void> {
  return uploadProfileMedia(accessToken, file, "avatar");
}

export function uploadProfileCover(accessToken: string, file: File): Promise<void> {
  return uploadProfileMedia(accessToken, file, "cover");
}

/** 프로필 사진과 배경은 동일한 업로드 규칙과 오류 처리를 사용합니다. */
async function uploadProfileMedia(
  accessToken: string,
  file: File,
  kind: "avatar" | "cover",
): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${baseUrl}/v1/users/me/profile/${kind}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  });
  if (!response.ok) {
    throw await responseError(response, "프로필 이미지를 저장하지 못했어요.");
  }
}

export async function removeProfileImage(
  accessToken: string,
  kind: "avatar" | "cover",
): Promise<void> {
  const response = await fetch(`${baseUrl}/v1/users/me/profile/${kind}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw await responseError(response, "프로필 이미지를 삭제하지 못했어요.");
  }
}

export function getPlanCatalog(accessToken: string): Promise<PlanCatalog> {
  return request("/subscriptions/plans", accessToken);
}

export function getSubscriptions(
  accessToken: string,
): Promise<ActiveSubscription[]> {
  return request("/subscriptions", accessToken);
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
): Promise<SubscribeResult> {
  return request("/subscriptions", accessToken, {
    method: "POST",
    body: JSON.stringify({ targetAccountId, subscriptionType, termMonths }),
  });
}
