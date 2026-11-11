import { useState } from "react";
import { currentPosition, RECENT_POSITION_MS, type Coordinates } from "../../utils/geo";

/** 지역 고르기에서 내 주변을 골랐을 때의 위치 확인 상태입니다. */
type LocationState =
  | { status: "idle" | "locating" | "denied" | "unsupported" }
  | { status: "ready"; position: Coordinates };

/**
 * 맛객 탭의 내 위치입니다. 화면을 열 때 묻지 않고, "내 주변"을 고르거나 다시 확인을 누를 때만 위치를 묻습니다.
 * TastersScreen이 한 번 만들어 지역 버튼·위치 안내(ScopeNotice)와 두 섹션의 범위 계산(ScopeContext)에 나눠 줍니다.
 */
export function useOnDemandLocation() {
  const [location, setLocation] = useState<LocationState>({ status: "idle" });

  function locate() {
    if (!navigator.geolocation) {
      setLocation({ status: "unsupported" });
      return;
    }
    setLocation({ status: "locating" });
    // 내 주변(NEARBY_RADIUS_METERS) 맛객을 거르는 데는 대략의 위치로 충분합니다.
    currentPosition(RECENT_POSITION_MS).then(
      (position) => setLocation({ status: "ready", position }),
      () => setLocation({ status: "denied" }),
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
