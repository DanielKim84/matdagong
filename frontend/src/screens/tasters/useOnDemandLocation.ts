import { useState } from "react";
import type { Coordinates } from "../../utils/geo";

/** 내 주변 칩을 눌렀을 때의 위치 확인 상태입니다. */
type LocationState =
  | { status: "idle" | "locating" | "denied" | "unsupported" }
  | { status: "ready"; position: Coordinates };

// 5km 안 맛객을 거르는 데는 대략의 위치로 충분하므로 빠른 응답을 고르고, 5분 안에 잡은 위치는 다시 씁니다.
const LOCATION_OPTIONS: PositionOptions = { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 };

/**
 * 맛객 탭의 내 위치입니다. 화면을 열 때 묻지 않고, "내 주변"을 고르거나 다시 확인을 누를 때만 위치를 묻습니다.
 * TastersScreen이 한 번 만들어 범위 칩·취향 맞는 맛객·맛객 둘러보기에 나눠 줍니다.
 */
export function useOnDemandLocation() {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  function locate() {
    if (!navigator.geolocation) {
      setLocation({ status: "unsupported" });
      return;
    }
    setLocation({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      ({ coords }) =>
        setLocation({ status: "ready", position: { latitude: coords.latitude, longitude: coords.longitude } }),
      () => setLocation({ status: "denied" }),
      LOCATION_OPTIONS,
    );
  }

  /** 아직 위치가 없고 확인 중도 아니면 위치를 묻습니다. */
  function ensure() {
    if (location.status !== "ready" && location.status !== "locating") locate();
  }

  return {
    location,
    position: location.status === "ready" ? location.position : null,
    locate,
    ensure,
  };
}

export type OnDemandLocation = ReturnType<typeof useOnDemandLocation>;
