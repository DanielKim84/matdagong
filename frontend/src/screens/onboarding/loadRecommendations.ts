import { getTasters } from "../../services/community";
import { getPlaces } from "../../services/places";
import type { Taster } from "../../models/place";
import { accountIdFromAccessToken } from "../../utils/accessToken";

/** 가입 단계에서 서버 목록(취향 태그, 추천 맛객)을 받는 상태입니다. */
export type LoadState = "loading" | "ready" | "error";

/**
 * 가입 3단계(SignupMatchStep)의 추천 맛객 한 줄. reason은 왜 추천했는지입니다:
 * taste는 내가 고른 취향과 겹치는 맛객(취향 %), popular는 취향이 없거나 모자라 채운 많이 찾는 맛객(구독자·기록 많은 순)입니다.
 */
export type Recommendation = { taster: Taster; recordCount: number; reason: "taste" | "popular" };

/** 가입 때 보여 줄 추천 맛객 수입니다. 고르기 쉽게 한 화면 안팎으로 둡니다. */
export const RECOMMEND_LIMIT = 5;

/**
 * 공개 기록이 있는 맛객 중에서 추천합니다. 취향이 겹치는 맛객을 취향 % 순으로 먼저 넣고, 모자라면(취향을 안 골랐거나 겹치는 맛객이
 * 적으면) 구독자가 많은 → 기록이 많은 맛객으로 채웁니다. 장소 목록을 못 받으면 기록 여부는 보지 않습니다.
 */
export async function loadRecommendations(accessToken: string): Promise<Recommendation[]> {
  const [tasters, places] = await Promise.all([getTasters(accessToken), getPlaces(accessToken, "").catch(() => null)]);
  const myId = accountIdFromAccessToken(accessToken);
  const recordCounts = new Map<string, number>();
  places?.forEach((place) =>
    place.tasters.forEach((record) => {
      if (record.visibility === "PRIVATE") return;
      recordCounts.set(record.tasterId, (recordCounts.get(record.tasterId) ?? 0) + 1);
    }),
  );
  const candidates = tasters.filter(
    (taster) => taster.tasterId !== myId && (!places || recordCounts.has(taster.tasterId)),
  );
  const recordCountOf = (taster: Taster) => recordCounts.get(taster.tasterId) ?? 0;
  const byTaste = candidates
    .filter((taster) => (taster.matchScore ?? 0) > 0)
    .sort((left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0))
    .slice(0, RECOMMEND_LIMIT);
  const picked = new Set(byTaste.map((taster) => taster.tasterId));
  const popular = candidates
    .filter((taster) => !picked.has(taster.tasterId))
    .sort(
      (left, right) =>
        (right.subscriberCount ?? 0) - (left.subscriberCount ?? 0) || recordCountOf(right) - recordCountOf(left),
    )
    .slice(0, RECOMMEND_LIMIT - byTaste.length);
  return [
    ...byTaste.map((taster) => ({ taster, recordCount: recordCountOf(taster), reason: "taste" as const })),
    ...popular.map((taster) => ({ taster, recordCount: recordCountOf(taster), reason: "popular" as const })),
  ];
}
