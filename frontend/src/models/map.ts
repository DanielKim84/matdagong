import type { Coordinates } from "../utils/geo";
import type { MapKind, Place } from "./place";

/** 지도와 마커 안내가 공유하는 내 캐릭터 정보입니다. */
export type MapMe = { name: string; variant: number };
/** 같은 반경을 다시 골라도 맞추도록 요청 번호가 바뀔 때마다 한 번 적용합니다. */
export type RadiusView = { meters: number; requestId: number };
/** 요청 번호가 바뀔 때마다 지정한 장소가 모두 보이도록 한 번 맞춥니다. */
export type FitRequest = { places: Place[]; requestId: number };
/** 요청 번호가 바뀔 때마다 이 좌표를 가운데 두고 이 배율(카카오 level)로 한 번 옮깁니다(발견 지역 선택). */
export type CenterRequest = { center: Coordinates; level: number; requestId: number };

/** 지도 컴포넌트의 공통 표시·범위 요청 계약입니다. */
export type MapCanvasProps = {
  places: Place[];
  subscriptions: string[];
  onSelect: (place: Place) => void;
  /** 지도가 멈출 때마다 보이는 범위를 알립니다. 사용자가 직접 움직였는지도 따로 전달합니다. */
  onBoundsChange?: (bounds: MapBounds, isFocusMove: boolean, isUserMove: boolean) => void;
  onPositionChange?: (position: Coordinates) => void;
  /** 사용자가 내 위치 버튼으로 위치를 다시 확인하면 현재 장소 선택을 풉니다. */
  onManualLocate?: () => void;
  /** 상세 화면을 다녀와도 중심·배율을 유지할 지도 구분자입니다. */
  cameraKey?: "discover" | "mymap";
  /** 상세에서 되돌아온 경우에만 저장된 중심·배율을 불러옵니다. */
  restoreCamera?: boolean;
  /** 초기 위치·반경 이동 때 검색창과 카드 사이의 보이는 지도 중앙으로 한 번 보정합니다. */
  centerOffsetY?: number;
  /** 강조할 장소. 바뀌면 그 마커를 키우고 지도 중심을 옮깁니다(발견·내 지도의 카드 선택). */
  focusedPlaceId?: string | null;
  /** 처음 그릴 때 받은 장소가 모두 보이도록 지도 범위를 맞춥니다(맛객 프로필 지도). */
  shouldFitToPlaces?: boolean;
  /** shouldFitToPlaces일 때 이 장소들만 꽉 차게 맞춥니다(핀은 places 전부 그대로). 없으면 places 전체에 맞춥니다(맛객 프로필의 지역 칩). */
  fitPlaces?: Place[];
  /** 내 위치를 가운데 두고 이 반경이 꼭 차게 지도를 맞춥니다(발견 화면의 반경 고르기). 그 뒤 확대·축소는 자유입니다. */
  radiusView?: RadiusView | null;
  /** 이 장소들이 모두 보이게 한 번 맞춥니다(발견 화면의 검색 결과). 그 뒤 확대·축소·이동은 자유입니다. */
  fitRequest?: FitRequest | null;
  /** 이 지역으로 한 번 옮깁니다(발견 지역 선택, 보드 05-02). 그 뒤 확대·축소·이동은 자유입니다. */
  centerRequest?: CenterRequest | null;
  /** 내 위치를 파란 점 대신 내 캐릭터로 보여 줄 때 넘깁니다(발견·내 지도). */
  me?: MapMe;
  /** 마커 종류를 직접 정합니다(내 지도: 내 기록·다녀온 곳·가볼 곳). 없으면 내 기록·구독 관계로 정합니다. */
  markerKindOf?: (place: Place) => MapKind;
};
