import { useEffect, useState } from "react";
import type { Coordinates } from "../../utils/geo";
import { VISIT_RADIUS_LABEL } from "../../models/place";

const LOCATING_MESSAGE = "현재 위치를 확인하고 있어요.";
// 주변 1km 검색에는 대략의 위치로 충분하므로 정확도보다 빠른 응답을 고릅니다.
const LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 };

/** 직접 방문한 곳만 기록하도록 주변 장소 검색에 쓸 현재 위치를 확인합니다. isEnabled면 처음 열 때 한 번 확인합니다. */
export function useCurrentLocation(isEnabled: boolean) {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState(LOCATING_MESSAGE);

  function refreshLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("이 기기에서는 현재 위치를 확인할 수 없어요.");
      return;
    }
    setLocationMessage(LOCATING_MESSAGE);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setLocationMessage(`직접 방문한 곳만 기록할 수 있도록 현재 위치 ${VISIT_RADIUS_LABEL} 안에서 찾아요.`);
      },
      () => setLocationMessage("주변 장소를 찾으려면 위치 권한을 허용해 주세요."),
      LOCATION_OPTIONS,
    );
  }

  useEffect(() => {
    if (isEnabled) refreshLocation();
  }, []);

  return { location, locationMessage, refreshLocation };
}
