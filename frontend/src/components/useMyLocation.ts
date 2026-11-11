import { useEffect, useRef, useState } from "react";
import { currentPosition, RECENT_POSITION_MS, type Coordinates } from "../utils/geo";

/**
 * 지도(MapCanvas)의 내 위치입니다. 처음 그릴 때 안내 없이 한 번 확인하고, locate()는 '내 위치' 버튼처럼 진행 안내를 띄우며 확인합니다.
 * 위치를 얻을 때마다 onPositionChange를, 버튼으로 확인했을 때만 onManualLocate를 부릅니다.
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

  function locate(shouldShowStatus = true) {
    if (!navigator.geolocation) {
      if (shouldShowStatus) setLocationMessage("이 브라우저에서는 위치를 확인할 수 없어요.");
      return;
    }
    if (shouldShowStatus) setLocationMessage("내 위치를 확인하고 있어요.");
    currentPosition(RECENT_POSITION_MS).then(
      (next) => {
        setPosition(next);
        positionCallback.current?.(next);
        setLocationMessage("");
        if (shouldShowStatus) manualLocateCallback.current(next);
      },
      () => shouldShowStatus && setLocationMessage("위치 권한을 허용해 주세요."),
    );
  }

  // 처음 그릴 때 안내 없이 한 번 위치를 확인합니다. 권한이 없으면 조용히 넘어가 지도는 기본 중심을 유지합니다.
  useEffect(() => {
    locate(false);
  }, []);

  return { position, locationMessage, locate: () => locate() };
}
