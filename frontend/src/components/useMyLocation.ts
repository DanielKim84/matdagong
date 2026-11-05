import { useEffect, useRef, useState } from "react";
import type { Coordinates } from "../utils/geo";

// 위치는 10초까지 기다리고, 5분 안에 얻은 위치면 다시 묻지 않고 씁니다.
const LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 };

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

  function locate(showStatus = true) {
    if (!navigator.geolocation) {
      if (showStatus) setLocationMessage("이 브라우저에서는 위치를 확인할 수 없어요.");
      return;
    }
    if (showStatus) setLocationMessage("내 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const next = { latitude: coords.latitude, longitude: coords.longitude };
        setPosition(next);
        positionCallback.current?.(next);
        setLocationMessage("");
        if (showStatus) manualLocateCallback.current(next);
      },
      () => showStatus && setLocationMessage("위치 권한을 허용해 주세요."),
      LOCATION_OPTIONS,
    );
  }

  // 지도를 열면 현재 위치로 중심을 옮겨 주변 기록을 먼저 보여줍니다. 권한이 없으면 안내 없이 기본 중심을 유지합니다.
  useEffect(() => {
    locate(false);
  }, []);

  return { position, locationMessage, locate: () => locate() };
}
