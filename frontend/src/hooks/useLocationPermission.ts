import { useEffect, useState } from "react";
import { watchLocationPermission, type LocationPermission } from "../utils/geo";

/** 지금 위치 권한 상태입니다. 설정에서 바꾸면 따라 바뀝니다(발견의 위치 권한 없음 안내, 보드 18-01). */
export function useLocationPermission(): LocationPermission {
  const [permission, setPermission] = useState<LocationPermission>("unknown");
  useEffect(() => watchLocationPermission(setPermission), []);
  return permission;
}
