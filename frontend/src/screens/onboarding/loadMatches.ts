import { getTasters } from "../../services/community";
import { getPlaces } from "../../services/places";
import type { Taster } from "../../models/place";
import { accountIdFromAccessToken } from "../../utils/accessToken";

export type Match = { taster: Taster; photos: string[] };
/** 가입 단계에서 서버 목록(취향 태그, 추천 맛객)을 받는 상태입니다. */
export type LoadState = "loading" | "ready" | "error";

// 카드 한 장에 보여 줄 기록 사진 수입니다.
const MAX_MATCH_PHOTOS = 3;

/** 공개 기록이 있고 내 취향과 겹치는 맛객을 일치율 순으로 고르고, 각자의 기록 사진을 모읍니다. */
export async function loadMatches(accessToken: string): Promise<Match[]> {
  const [tasters, places] = await Promise.all([getTasters(accessToken), getPlaces(accessToken, "").catch(() => null)]);
  const myId = accountIdFromAccessToken(accessToken);
  const photosById = new Map<string, string[]>();
  const publicIds = new Set<string>();
  places?.forEach((place) =>
    place.tasters.forEach((record) => {
      if (record.visibility === "PRIVATE") return;
      publicIds.add(record.tasterId);
      const photos = photosById.get(record.tasterId) ?? [];
      record.photos?.forEach((photo) => {
        if (photos.length < MAX_MATCH_PHOTOS && !photos.includes(photo)) photos.push(photo);
      });
      photosById.set(record.tasterId, photos);
    }),
  );
  return (
    tasters
      .filter((taster) => taster.tasterId !== myId && (taster.matchScore ?? 0) > 0)
      // 장소 목록을 못 받았으면 공개 기록 여부를 알 수 없으니 일치율만으로 고릅니다.
      .filter((taster) => !places || publicIds.has(taster.tasterId))
      .sort((left, right) => (right.matchScore ?? 0) - (left.matchScore ?? 0))
      .map((taster) => ({ taster, photos: photosById.get(taster.tasterId) ?? [] }))
  );
}
