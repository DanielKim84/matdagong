/** 카카오 지도 SDK(window.kakao) 중 이 앱이 쓰는 부분만 적은 전역 타입입니다. */
export {};
declare global {
  interface MapCoordinate {
    getLat(): number;
    getLng(): number;
  }
  interface MapBounds {
    getSouthWest(): MapCoordinate;
    getNorthEast(): MapCoordinate;
    extend(position: MapCoordinate): void;
  }
  interface MapInstance {
    getCenter(): MapCoordinate;
    setCenter(position: MapCoordinate): void;
    setDraggable(value: boolean): void;
    setZoomable(value: boolean): void;
    relayout(): void;
    getBounds(): MapBounds;
    getLevel(): number;
    setLevel(level: number, options?: { animate?: boolean }): void;
    /** padding(px)은 위·오른쪽·아래·왼쪽 순서로, 그만큼 안쪽에 범위를 맞춥니다. */
    setBounds(
      bounds: MapBounds,
      paddingTop?: number,
      paddingRight?: number,
      paddingBottom?: number,
      paddingLeft?: number,
    ): void;
    panTo(position: MapCoordinate): void;
    panBy(dx: number, dy: number): void;
  }
  interface MapOverlay {
    setMap(map: MapInstance | null): void;
    setZIndex(zIndex: number): void;
  }
  /** Geocoder.coord2RegionCode 결과 한 줄. region_type은 "B"(법정동) 또는 "H"(행정동)입니다. */
  interface KakaoRegion {
    region_type: string;
    region_1depth_name: string;
    region_2depth_name: string;
    region_3depth_name: string;
  }
  /** Geocoder.addressSearch 결과 한 줄. x는 경도, y는 위도(문자열)입니다. */
  interface KakaoAddressResult {
    address_name: string;
    x: string;
    y: string;
  }
  interface KakaoGeocoder {
    addressSearch(query: string, callback: (result: KakaoAddressResult[], status: string) => void): void;
    coord2RegionCode(
      longitude: number,
      latitude: number,
      callback: (result: KakaoRegion[], status: string) => void,
    ): void;
  }
  interface KakaoPlaceResult {
    id: string;
    place_name: string;
    category_name: string;
    phone: string;
    address_name: string;
    road_address_name: string;
    x: string;
    y: string;
    place_url: string;
  }
  interface Kakao {
    maps: {
      load(callback: () => void): void;
      Map: new (
        element: HTMLElement,
        options: {
          center: MapCoordinate;
          level: number;
          draggable: boolean;
          zoomable: boolean;
        },
      ) => MapInstance;
      LatLng: new (latitude: number, longitude: number) => MapCoordinate;
      LatLngBounds: new () => MapBounds;
      CustomOverlay: new (options: {
        map: MapInstance;
        position: MapCoordinate;
        content: string | HTMLElement;
        yAnchor?: number;
        zIndex?: number;
      }) => MapOverlay;
      services: {
        Status: { OK: string; ZERO_RESULT: string };
        Places: new () => {
          keywordSearch(
            keyword: string,
            callback: (results: KakaoPlaceResult[], status: string) => void,
            options?: { size?: number; location?: MapCoordinate; radius?: number },
          ): void;
          categorySearch(
            categoryCode: string,
            callback: (results: KakaoPlaceResult[], status: string) => void,
            options: { location: MapCoordinate; radius: number; size?: number; sort?: string },
          ): void;
        };
        SortBy: { DISTANCE: string };
        Geocoder: new () => KakaoGeocoder;
      };
      event: {
        addListener(target: MapInstance, eventName: string, callback: () => void): void;
      };
    };
  }
  interface Window {
    kakao?: Kakao;
  }
}
