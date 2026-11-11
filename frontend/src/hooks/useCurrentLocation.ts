import { useEffect, useState } from "react";
import { currentPosition, type Coordinates } from "../utils/geo";

const LOCATING_MESSAGE = "현재 위치를 확인하고 있어요.";

/**
 * 직접 다녀온 곳만 남기도록(기록하기의 장소 고르기, 빠른 저장) 주변 가게 검색에 쓸 지금 위치와 안내 문구입니다.
 * isEnabled면 처음 그릴 때 한 번 확인하고, 위치를 얻으면 readyMessage를 안내로 둡니다.
 */
export function useCurrentLocation(readyMessage: string, isEnabled = true) {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationMessage, setLocationMessage] = useState(LOCATING_MESSAGE);

  function refreshLocation() {
    if (!navigator.geolocation) {
      setLocationMessage("이 기기에서는 현재 위치를 확인할 수 없어요.");
      return;
    }
    setLocationMessage(LOCATING_MESSAGE);
    currentPosition().then(
      (position) => {
        setLocation(position);
        setLocationMessage(readyMessage);
      },
      () => setLocationMessage("주변 장소를 찾으려면 위치 권한을 허용해 주세요."),
    );
  }

  useEffect(() => {
    if (isEnabled) refreshLocation();
  }, []);

  return { location, locationMessage, refreshLocation };
}
