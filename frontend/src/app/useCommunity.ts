import { useCallback, useEffect, useState } from "react";
import {
  cancelSubscription,
  createTagRequest,
  ensureMyProfile,
  getIncomingSubscriptions,
  getMyReportedTasters,
  getMyTagRequests,
  getPoints,
  getSubscriptions,
  getTasteTags,
  getTasters,
  reportTaster,
  saveMyProfile,
} from "../services/community";
import { ApiError } from "../services/http";
import type {
  ActiveSubscription,
  IncomingSubscription,
  MyProfile,
  PointAccount,
  ProfileChanges,
  TagRequestInput,
  TasteTag,
  TasterReportReason,
} from "../models/community";
import type { Taster } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import { RETRY_LATER_MESSAGE, type AppNotice } from "./AppData";

const EMPTY_POINTS: PointAccount = { balance: 0, history: [] };

/**
 * 커뮤니티 상태(내 프로필, 맛객, 취향 태그, 구독, 포인트, 내가 신고한 맛객)와 그 동작입니다.
 * 처음 그릴 때 한 번 불러오고, 프로필 저장·구독 취소 뒤 다시 맞춥니다.
 */
export function useCommunity(accessToken: string, displayName: string, notify: (notice: AppNotice) => void) {
  const [communityTasters, setCommunityTasters] = useState<Taster[]>([]);
  const [myProfile, setMyProfile] = useState<MyProfile | null>(null);
  const [tasteTags, setTasteTags] = useState<TasteTag[]>([]);
  const [subscriptions, setSubscriptions] = useState<ActiveSubscription[]>([]);
  const [incomingSubscriptions, setIncomingSubscriptions] = useState<IncomingSubscription[]>([]);
  const [points, setPoints] = useState<PointAccount>(EMPTY_POINTS);
  const [reportedTasterIds, setReportedTasterIds] = useState<string[]>([]);

  const refreshCommunity = useCallback(async () => {
    const profile = await ensureMyProfile(accessToken, displayName);
    setMyProfile(profile);
    // 맛객 목록만 꼭 있어야 하고, 나머지(구독·태그·포인트·신고 내역)는 하나가 실패해도 받은 것은 반영합니다.
    const results = await Promise.allSettled([
      getTasters(accessToken),
      getSubscriptions(accessToken),
      getTasteTags(accessToken),
      getIncomingSubscriptions(accessToken),
      getPoints(accessToken),
      getMyReportedTasters(accessToken),
    ]);
    const [tastersResult, subscriptionsResult, tasteTagsResult, incomingResult, pointsResult, reportedResult] = results;
    if (tastersResult.status === "rejected") throw tastersResult.reason;
    setCommunityTasters(tastersResult.value);
    setSubscriptions(subscriptionsResult.status === "fulfilled" ? subscriptionsResult.value : []);
    setTasteTags(tasteTagsResult.status === "fulfilled" ? tasteTagsResult.value : []);
    setIncomingSubscriptions(incomingResult.status === "fulfilled" ? incomingResult.value : []);
    setPoints(pointsResult.status === "fulfilled" ? pointsResult.value : EMPTY_POINTS);
    setReportedTasterIds(reportedResult.status === "fulfilled" ? reportedResult.value : []);
    const unavailable = results.find((result) => result.status === "rejected");
    if (unavailable?.status === "rejected") {
      notify({
        kind: "error",
        title: "일부 정보를 불러오지 못했어요",
        message: errorMessage(unavailable.reason, RETRY_LATER_MESSAGE),
      });
    }
  }, [accessToken, displayName, notify]);

  useEffect(() => {
    refreshCommunity().catch((cause: unknown) =>
      notify({
        kind: "error",
        title: "서비스 정보를 불러오지 못했어요",
        message: errorMessage(cause, RETRY_LATER_MESSAGE),
      }),
    );
  }, [refreshCommunity, notify]);

  /** 맛객 목록(신뢰 %)만 다시 받습니다. 실패해도 다음 새로고침에 맞춰집니다. */
  const reloadTasters = useCallback(() => {
    getTasters(accessToken)
      .then(setCommunityTasters)
      .catch(() => {});
  }, [accessToken]);

  const requestTag = useCallback((input: TagRequestInput) => createTagRequest(accessToken, input), [accessToken]);
  const loadTagRequests = useCallback(() => getMyTagRequests(accessToken), [accessToken]);

  /** 맛객 프로필과 구독 목록의 구독 취소가 같은 안내와 새로고침을 쓰도록 한곳에서 처리합니다. */
  async function cancelSubscriptionById(subscriptionId: string) {
    try {
      await cancelSubscription(accessToken, subscriptionId);
      setSubscriptions(await getSubscriptions(accessToken));
      notify({ kind: "success", title: "구독을 취소했어요", message: "언제든 다시 구독할 수 있어요." });
    } catch (cause) {
      notify({ kind: "error", title: "구독을 취소하지 못했어요", message: errorMessage(cause, RETRY_LATER_MESSAGE) });
    }
  }

  async function cancelTasterSubscription(tasterId: string) {
    const subscription = subscriptions.find((item) => item.targetAccountId === tasterId);
    if (subscription) await cancelSubscriptionById(subscription.subscriptionId);
  }

  /**
   * 맛객을 신고하고, 신고 버튼이 다시 눌리지 않게 신고한 맛객 목록에 넣습니다.
   * 이미 신고해 둔 맛객(409)이어도 목록에 넣은 뒤 오류를 그대로 던져 화면이 안내하게 합니다.
   */
  async function reportTasterById(tasterId: string, reason: TasterReportReason, memo: string, placeId?: string) {
    const markReported = () => setReportedTasterIds((ids) => (ids.includes(tasterId) ? ids : [...ids, tasterId]));
    try {
      await reportTaster(accessToken, tasterId, reason, memo, placeId);
      markReported();
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409) markReported();
      throw cause;
    }
  }

  async function saveProfile(changes: ProfileChanges) {
    // 부가 맛객 목록을 새로 읽지 못해도 저장된 프로필은 화면 상태에 즉시 반영합니다.
    setMyProfile(await saveMyProfile(accessToken, changes));
    let isRefreshFailed = false;
    try {
      await refreshCommunity();
    } catch {
      isRefreshFailed = true;
    }
    notify({
      kind: "success",
      title: "변경 내용을 저장했어요",
      message: isRefreshFailed
        ? "프로필과 취향은 저장됐어요. 다른 화면 정보는 잠시 후 다시 불러와요."
        : "프로필과 추천 취향에 반영했어요.",
    });
  }

  return {
    communityTasters,
    myProfile,
    tasteTags,
    subscriptions,
    incomingSubscriptions,
    points,
    reportedTasterIds,
    refreshCommunity,
    reloadTasters,
    requestTag,
    loadTagRequests,
    cancelSubscriptionById,
    cancelTasterSubscription,
    reportTaster: reportTasterById,
    saveProfile,
  };
}
