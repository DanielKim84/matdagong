import type { Place, Taster } from "../../models/place";
import { DAY_MS, parseTime } from "../../utils/format";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import { readStorageJson, STORAGE_KEYS, writeStorageJson } from "../../utils/storage";

/** 피드에 보일 기록 한 건(장소 + 기록한 맛객). */
export type FeedRecord = {
  key: string;
  place: Place;
  taster: Taster;
  /** 작성자 이름·사진·취향 점수는 커뮤니티 프로필을 우선합니다. */
  author: { id: string; name: string; avatar?: string; fallbackAvatar?: string; variant: number; matchScore?: number };
  /** recordedAt 을 숫자로 바꾼 값. 시각이 없으면 0 */
  time: number;
  photo?: string;
};

/** 같은 맛객의 기록 묶음(스토리 한 사람분). */
export type StoryGroup = {
  tasterId: string;
  name: string;
  avatar?: string;
  fallbackAvatar?: string;
  variant: number;
  records: FeedRecord[];
  /** 아직 보지 않은 최근 기록이 있으면 true(링 표시) */
  isFresh: boolean;
};

/** 스토리 링을 켜는 "새 기록" 기간 */
export const FRESH_WINDOW_MS = 3 * DAY_MS;
/** 카드에 "새 기록" 표시를 붙이는 기간 */
export const NEW_BADGE_MS = DAY_MS;

/**
 * 공개 장소의 맛객 기록을 기록 단위로 펼쳐 최신순으로 정렬합니다.
 * 시각이 없는 기록은 뒤로 보내고, 내 기록과 비공개 기록은 뺍니다.
 */
export function collectFeedRecords(
  places: Place[],
  tasterById: Map<string, Taster>,
  isMine: (tasterId: string) => boolean,
): FeedRecord[] {
  const records: FeedRecord[] = [];
  for (const place of places) {
    if (place.advertisement) continue;
    for (const taster of place.tasters) {
      if (taster.visibility === "PRIVATE" || isMine(taster.tasterId)) continue;
      const profile = tasterById.get(taster.tasterId);
      const rawAvatar = profile?.avatar || taster.avatar;
      records.push({
        key: `${place.id}:${taster.tasterId}`,
        place,
        taster,
        author: {
          id: taster.tasterId,
          name: profile?.tasterName || taster.tasterName || "맛객",
          avatar: avatarSource(taster.tasterId, rawAvatar),
          fallbackAvatar: avatarFallback(taster.tasterId, rawAvatar),
          variant: profile?.avatarVariant ?? taster.avatarVariant,
          matchScore: profile?.matchScore ?? taster.matchScore,
        },
        time: parseTime(taster.recordedAt) ?? 0,
        photo: taster.photos?.find(Boolean),
      });
    }
  }
  // 시각이 없으면(0) 자연스럽게 맨 뒤로 갑니다. 같은 값끼리는 원래 순서를 지킵니다.
  return records.sort((left, right) => right.time - left.time);
}

/** "마포구 망원동"처럼 주소에서 구·동만 짧게 뽑습니다. */
export function shortArea(place: Place): string {
  const parts = (place.address || place.roadAddress || place.lotAddress || "").split(/\s+/).filter(Boolean);
  return parts.slice(1, 3).join(" ");
}

/** 맛객별로 마지막으로 본 스토리 기록 시각입니다. 저장소를 못 쓰거나 값이 깨졌으면 빈 값입니다. */
export function readStorySeen(): Record<string, number> {
  const value = readStorageJson(STORAGE_KEYS.feedStorySeen, "local");
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const seen: Record<string, number> = {};
  for (const [tasterId, time] of Object.entries(value)) if (typeof time === "number") seen[tasterId] = time;
  return seen;
}

/** 저장하지 못해도 화면 동작에는 영향이 없어 결과를 확인하지 않습니다. */
export function writeStorySeen(seen: Record<string, number>) {
  writeStorageJson(STORAGE_KEYS.feedStorySeen, seen, "local");
}
