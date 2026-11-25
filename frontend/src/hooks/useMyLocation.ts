import { useEffect, useRef, useState } from "react";
import { currentPosition, RECENT_POSITION_MS, watchLocationPermission, type Coordinates } from "../utils/geo";

/**
 * 지도(MapCanvas)의 내 위치입니다. 처음에는 최근 위치를 조용히 확인하고, 버튼은 새 위치를 확인해 지도에 반영합니다.
 * 최신 요청의 위치를 얻으면 onPositionChange를, 버튼으로 확인했을 때만 onManualLocate를 부릅니다.
 */
export function useMyLocation({
  onPositionChange,
  onManualLocate,
}: {
  onPositionChange?: (position: Coordinates) => void;
  onManualLocate: (position: Coordinates) => void;
}) {
  const positionCallback = useRef(onPositionChange);
  const manualLocateCallback = useRef(onManualLocate);
  positionCallback.current = onPositionChange;
  manualLocateCallback.current = onManualLocate;
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState("");
  // 늦게 도착한 이전 요청과 화면을 떠난 뒤의 응답은 부모 지도까지 갱신하지 않게 버립니다.
  const requestId = useRef(0);

  function locate(shouldShowStatus = true) {
    const currentRequest = ++requestId.current;
    if (!navigator.geolocation) {
      if (shouldShowStatus) setLocationMessage("이 브라우저에서는 위치를 확인할 수 없어요.");
      return;
    }
    if (shouldShowStatus) setLocationMessage("내 위치를 확인하고 있어요.");
    // 시작 시에는 최근 위치로 빠르게 표시하고, 버튼을 눌렀을 때는 오래된 캐시 대신 새 위치를 확인합니다.
    currentPosition(shouldShowStatus ? 0 : RECENT_POSITION_MS).then(
      (next) => {
        if (currentRequest !== requestId.current) return;
        setPosition(next);
        positionCallback.current?.(next);
        setLocationMessage("");
        if (shouldShowStatus) manualLocateCallback.current(next);
      },
      () => {
        if (currentRequest === requestId.current && shouldShowStatus) {
          setLocationMessage("위치 권한을 허용해 주세요.");
        }
      },
    );
  }

  // 처음 그릴 때 안내 없이 한 번 위치를 확인합니다. 권한이 없으면 조용히 넘어가 지도는 기본 중심을 유지합니다.
  useEffect(() => {
    locate(false);
    return () => {
      requestId.current += 1;
    };
  }, []);

  // 위치 권한 없음 안내(보드 18-01)를 보고 설정에서 권한을 켜면, 화면을 다시 열지 않아도 바로 내 위치를 잡습니다.
  useEffect(() => {
    let previous: string | null = null;
    return watchLocationPermission((permission) => {
      if (previous !== null && previous !== "granted" && permission === "granted") locate(false);
      previous = permission;
    });
  }, []);

  return { position, locationMessage, locate: () => locate() };
}
