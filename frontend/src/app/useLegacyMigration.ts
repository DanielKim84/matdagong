import { useEffect, useRef } from "react";
import { clearLegacyActivity, useActivity } from "../services/activity";
import {
  createPlaceRecord,
  getLikedPlaceIds,
  getMyPlaceRecords,
  getRecentPlaces,
  getVisitedLikedPlaceIds,
  rememberRecentPlace,
  setPlaceLiked,
} from "../services/places";
import type { NewPlace, Place } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import { placeMigrationKey, readStorage, recentMigrationKey, writeStorage } from "../utils/storage";
import { RETRY_LATER_MESSAGE, type AppNotice } from "./AppData";

const MIGRATION_DONE = "done";

function isMigrated(key: string): boolean {
  return readStorage(key, "local") === MIGRATION_DONE;
}

type LegacyMigrationTargets = {
  setRecentPlaces: (places: Place[]) => void;
  setMyPlaceState: (records: Place[], likedIds: string[], visitedLikedIds: string[]) => void;
  notify: (notice: AppNotice) => void;
};

/**
 * 이전 버전 브라우저 기록을 계정 DB로 옮깁니다.
 * 서버 저장 전 버전은 최근 본 장소·등록 기록·하트를 이 브라우저(localStorage)에만 남겼습니다.
 * 계정별로 한 번 서버에 옮기고 완료 표시를 남기며, 두 이전이 모두 끝나면 이전 저장소를 지웁니다.
 * 아직 옮기지 못한 사용자의 기록을 잃지 않도록 유지합니다.
 * 반환값은 이 브라우저의 등록 기록 전체와, 그중 아직 서버로 옮기지 못해 화면에 따로 보여줄 기록입니다.
 */
export function useLegacyMigration(
  accessToken: string,
  accountId: string | undefined,
  { setRecentPlaces, setMyPlaceState, notify }: LegacyMigrationTargets,
): { legacyRegistered: NewPlace[]; legacyStillLocal: NewPlace[] } {
  const activity = useActivity();
  // 같은 계정에서 이전 작업이 중복 실행되지 않게 합니다.
  const recentSyncStarted = useRef(new Set<string>());
  const placeSyncStarted = useRef(new Set<string>());

  useEffect(() => {
    if (!accountId) return;
    const migrationKey = recentMigrationKey(accountId);
    if (readStorage(migrationKey, "local") || recentSyncStarted.current.has(accountId)) return;
    recentSyncStarted.current.add(accountId);
    let active = true;
    (async () => {
      const savedPlaces = await getRecentPlaces(accessToken);
      const savedIds = new Set(savedPlaces.map((place) => place.id));
      for (const placeId of activity.recent) {
        if (!savedIds.has(placeId)) {
          try {
            await rememberRecentPlace(accessToken, placeId);
          } catch {
            /* 만료되었거나 삭제된 이전 기기 기록은 이전하지 않습니다. */
          }
        }
      }
      writeStorage(migrationKey, MIGRATION_DONE, "local");
      const mergedPlaces = await getRecentPlaces(accessToken);
      if (active) setRecentPlaces(mergedPlaces);
    })().catch(() => {
      // 이전 브라우저 기록 이전은 실패해도 상세 화면 열람을 막지 않습니다.
      recentSyncStarted.current.delete(accountId);
    });
    return () => {
      active = false;
    };
  }, [accessToken, activity.recent, accountId, setRecentPlaces]);

  useEffect(() => {
    if (!accountId) return;
    const migrationKey = placeMigrationKey(accountId);
    if (readStorage(migrationKey, "local") || placeSyncStarted.current.has(accountId)) return;
    placeSyncStarted.current.add(accountId);
    let active = true;
    // 이전 버전에서 이 브라우저에만 저장했던 카카오 장소 기록과 하트를 계정 DB로 옮깁니다.
    (async () => {
      for (const place of activity.registered) {
        if (!place.providerPlaceId || place.reason.trim().length < 5) continue;
        await createPlaceRecord(accessToken, place);
      }
      for (const placeId of activity.liked) await setPlaceLiked(accessToken, placeId, true);
      const [records, likedIds, visitedLikedIds] = await Promise.all([
        getMyPlaceRecords(accessToken),
        getLikedPlaceIds(accessToken),
        getVisitedLikedPlaceIds(accessToken),
      ]);
      writeStorage(migrationKey, MIGRATION_DONE, "local");
      if (active) setMyPlaceState(records, likedIds, visitedLikedIds);
    })().catch((cause: unknown) => {
      placeSyncStarted.current.delete(accountId);
      if (active)
        notify({
          kind: "error",
          title: "기존 맛집 기록을 옮기지 못했어요",
          message: errorMessage(cause, RETRY_LATER_MESSAGE),
        });
    });
    return () => {
      active = false;
    };
  }, [accessToken, activity.registered, activity.liked, accountId, setMyPlaceState, notify]);

  useEffect(() => {
    if (!accountId) return;
    if (isMigrated(recentMigrationKey(accountId)) && isMigrated(placeMigrationKey(accountId))) clearLegacyActivity();
  }, [accountId]);

  const isStillLocal = !accountId || !readStorage(placeMigrationKey(accountId), "local");
  return { legacyRegistered: activity.registered, legacyStillLocal: isStillLocal ? activity.registered : [] };
}
