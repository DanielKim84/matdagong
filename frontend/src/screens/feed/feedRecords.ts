/** 피드 탭(FeedScreen)과 스토리 뷰어가 쓰는 기록 펼치기·스토리 본 기록 저장입니다. */
import type { Place, Taster } from "../../models/place";
import type { TrustTaster } from "../../models/trust";
import { DAY_MS, parseTime } from "../../utils/format";
import { avatarFallback, avatarSource } from "../../utils/profileMedia";
import { readStorageJson, STORAGE_KEYS, writeStorageJson } from "../../utils/storage";

/** 피드에 보일 기록 한 건(장소 + 기록한 맛객). */
export type FeedRecord = {
  key: string;
  place: Place;
  taster: Taster;
  /** 작성자 이름·사진·취향·신뢰 점수는 커뮤니티 프로필을 우선합니다. */
  author: { id: string; name: string; avatar?: string; fallbackAvatar?: string; variant: number } & TrustTaster;
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
  /** 스토리로 넘겨 볼 기록. 안 본 최근 기록이 있으면 그것만(오래된 것부터), 없으면 가장 최근 기록 몇 개(최신부터)입니다. */
  records: FeedRecord[];
  /** 아직 보지 않은 최근 기록 수. 1 이상이면 링을 코랄로 켭니다. */
  unseenCount: number;
};

/** 안 본 새 기록으로 치는 기간. 이보다 오래된 기록은 링을 켜지 않습니다. */
export const STORY_WINDOW_DAYS = 14;
const STORY_WINDOW_MS = STORY_WINDOW_DAYS * DAY_MS;
/** 한 맛객분 스토리에 담는 최대 기록 수 */
const STORY_LIMIT = 10;
/** 안 본 새 기록이 없을 때(회색 링) 보여 줄 가장 최근 기록 수 */
const LATEST_LIMIT = 3;
/** 맛객마다 기억해 두는 본 기록 수. 오래된 것부터 버려 저장 값이 끝없이 늘지 않게 합니다. */
const SEEN_KEEP_LIMIT = 50;
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
          trustScore: profile?.trustScore ?? taster.trustScore,
          trustLevel: profile?.trustLevel ?? taster.trustLevel,
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

/** 맛객별로 스토리에서 본 기록 key 목록입니다. */
export type StorySeen = Record<string, string[]>;

/**
 * 맛객 한 명의 스토리 묶음을 만듭니다. 최근 STORY_WINDOW_DAYS일 안 기록 중 안 본 것이 있으면 그것만 오래된 것부터 넘겨 보고,
 * 없으면(회색 링) 기간과 상관없이 가장 최근 기록 LATEST_LIMIT개를 최신부터 보여 줍니다. 누르면 늘 스토리가 열리게 해
 * 링마다 다른 곳(스토리·프로필)으로 가서 헷갈리지 않게 합니다. 기록이 하나도 없을 때만 records가 비어 프로필로 보냅니다.
 */
export function storyRecords(records: FeedRecord[], seenKeys: string[] = [], now = Date.now()) {
  const recent = records.filter((record) => record.time > 0 && now - record.time < STORY_WINDOW_MS);
  const seen = new Set(seenKeys);
  const unseen = recent.filter((record) => !seen.has(record.key)).reverse();
  return {
    records: unseen.length ? unseen.slice(0, STORY_LIMIT) : records.slice(0, LATEST_LIMIT),
    unseenCount: unseen.length,
  };
}

/** 본 기록을 더한 새 목록입니다. 이미 봤으면 그대로 돌려줍니다. */
export function addSeen(seen: StorySeen, tasterId: string, recordKey: string): StorySeen {
  const current = seen[tasterId] ?? [];
  if (current.includes(recordKey)) return seen;
  return { ...seen, [tasterId]: [...current, recordKey].slice(-SEEN_KEEP_LIMIT) };
}

/** 저장소를 못 쓰거나 값이 깨졌으면 빈 값입니다. 예전 형식(맛객별 마지막 본 시각 숫자)은 버리고 새로 셉니다. */
export function readStorySeen(): StorySeen {
  const value = readStorageJson(STORAGE_KEYS.feedStorySeen, "local");
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const seen: StorySeen = {};
  for (const [tasterId, keys] of Object.entries(value)) {
    if (Array.isArray(keys)) seen[tasterId] = keys.filter((key): key is string => typeof key === "string");
  }
  return seen;
}

/** 저장하지 못해도 화면 동작에는 영향이 없어 결과를 확인하지 않습니다. */
export function writeStorySeen(seen: StorySeen) {
  writeStorageJson(STORAGE_KEYS.feedStorySeen, seen, "local");
}
