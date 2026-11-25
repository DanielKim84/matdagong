/** 상세 화면 이동 전후에 발견·내 지도의 중심과 배율을 복원합니다. */
import { isRecord, readStorageJson, removeStorage, STORAGE_KEYS, writeStorageJson } from "./storage";

type SavedMapCamera = { latitude: number; longitude: number; level: number };
type SavedMapReturn = { placeId: string };

function storageKey(cameraKey: string) {
  return `${STORAGE_KEYS.mapCamera}.${cameraKey}`;
}

function returnStorageKey(cameraKey: string) {
  return `${STORAGE_KEYS.mapReturn}.${cameraKey}`;
}

/**
 * 이 페이지를 연 한 번을 가리키는 값입니다. 새로고침하면 바뀌므로, 새로고침 전에 남긴 "돌아올 자리"는 쓰지 않습니다.
 * (performance의 navigation 종류로 거르면 한 번 새로고침한 뒤로는 그 탭이 내내 "reload"라 상세에서 돌아와도 복원되지 않았습니다.)
 */
const PAGE_LOAD_ID = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** 상세로 이동하기 전 선택한 마커를 저장해, 뒤로 돌아왔을 때 선택과 지도 위치(MapCanvas의 restoreCamera)를 복원합니다. */
export function prepareMapReturn(cameraKey: string, placeId: string): void {
  writeStorageJson(returnStorageKey(cameraKey), { placeId, pageLoadId: PAGE_LOAD_ID }, "session");
}

/** 화면 초기화 중에도 반복 호출할 수 있도록, 저장된 선택만 읽습니다. 같은 페이지에서 남긴 것만 씁니다. */
export function readMapReturn(cameraKey: string): SavedMapReturn | null {
  const saved = readStorageJson(returnStorageKey(cameraKey), "session");
  if (!isRecord(saved) || saved.pageLoadId !== PAGE_LOAD_ID) return null;
  return typeof saved.placeId === "string" ? { placeId: saved.placeId } : null;
}

/** 지도 화면이 복원 값을 상태로 받은 뒤 일회성 값을 지웁니다. */
export function clearMapReturn(cameraKey: string): void {
  removeStorage(returnStorageKey(cameraKey), "session");
}

export function readMapCamera(cameraKey?: string): SavedMapCamera | null {
  if (!cameraKey) return null;
  const saved = readStorageJson(storageKey(cameraKey), "session");
  if (
    !isRecord(saved) ||
    typeof saved.latitude !== "number" ||
    typeof saved.longitude !== "number" ||
    typeof saved.level !== "number" ||
    !Number.isFinite(saved.latitude) ||
    !Number.isFinite(saved.longitude) ||
    !Number.isFinite(saved.level) ||
    saved.latitude < -90 ||
    saved.latitude > 90 ||
    saved.longitude < -180 ||
    saved.longitude > 180 ||
    saved.level < 1 ||
    saved.level > 20
  ) {
    return null;
  }
  return { latitude: saved.latitude, longitude: saved.longitude, level: saved.level };
}

export function hasSavedMapCamera(cameraKey: string): boolean {
  return readMapCamera(cameraKey) !== null;
}

export function saveMapCamera(cameraKey: string | undefined, camera: SavedMapCamera): void {
  if (!cameraKey) return;
  writeStorageJson(storageKey(cameraKey), camera, "session");
}
