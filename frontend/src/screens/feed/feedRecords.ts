import type { Place, Taster } from "../../models/place";
import { demoTasterAvatar } from "../../utils/profileMedia";

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
  fresh: boolean;
};

/** 스토리 링을 켜는 "새 기록" 기간 */
export const FRESH_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
/** 카드에 "새 기록" 표시를 붙이는 기간 */
export const NEW_BADGE_MS = 24 * 60 * 60 * 1000;

function parseTime(value?: string | null): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

/** 맛객 사진 값이 이미지 주소가 아니면(샘플 기록의 이니셜 등) 기본 캐릭터로 돌립니다. */
export function avatarSource(tasterId: string, avatar?: string | null): string | undefined {
  const source = avatar?.trim();
  if (source && (/^demo-avatar:\d$/.test(source) || /^(https?:|data:image\/|blob:|\/media\/)/.test(source))) return source;
  return demoTasterAvatar(tasterId) || undefined;
}

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
      const avatar = avatarSource(taster.tasterId, rawAvatar);
      const demo = demoTasterAvatar(taster.tasterId) || undefined;
      records.push({
        key: `${place.id}:${taster.tasterId}`,
        place,
        taster,
        author: {
          id: taster.tasterId,
          name: profile?.tasterName || taster.tasterName || "맛객",
          avatar,
          fallbackAvatar: demo && demo !== avatar ? demo : undefined,
          variant: profile?.avatarVariant ?? taster.avatarVariant,
          matchScore: profile?.matchScore ?? taster.matchScore,
        },
        time: parseTime(taster.recordedAt),
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

/** 카카오맵 길찾기를 엽니다. */
export function openDirections(place: Place) {
  window.location.href = `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`;
}

/** 장소 링크를 공유하거나(지원 기기) 복사합니다. 결과 문구를 돌려줍니다. */
export async function sharePlace(place: Place): Promise<"shared" | "copied" | "cancelled" | "failed"> {
  const url = `${window.location.origin}${window.location.pathname}#place/${encodeURIComponent(place.id)}`;
  try {
    if (navigator.share) {
      await navigator.share({ title: place.name, text: `맛다공에서 본 ${place.name}`, url });
      return "shared";
    }
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") return "cancelled";
    return "failed";
  }
}

const SEEN_KEY = "matdagong.feed.storySeen";

/** 맛객별로 마지막으로 본 스토리 기록 시각입니다. 저장소를 못 쓰면 빈 값입니다. */
export function readStorySeen(): Record<string, number> {
  try {
    const value: unknown = JSON.parse(window.localStorage.getItem(SEEN_KEY) || "{}");
    return value && typeof value === "object" ? (value as Record<string, number>) : {};
  } catch {
    return {};
  }
}

export function writeStorySeen(seen: Record<string, number>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // 저장하지 못해도 화면 동작에는 영향이 없습니다.
  }
}
