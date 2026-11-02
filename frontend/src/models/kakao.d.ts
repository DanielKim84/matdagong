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
    setCenter(position: MapCoordinate): void;
    setDraggable(value: boolean): void;
    setZoomable(value: boolean): void;
    relayout(): void;
    getBounds(): MapBounds;
    getLevel(): number;
    setLevel(level: number, options?: { animate?: boolean }): void;
    setBounds(bounds: MapBounds): void;
    panTo(position: MapCoordinate): void;
  }
  interface MapMarker {
    setMap(map: MapInstance | null): void;
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
  interface KakaoGeocoder {
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
      Size: new (width: number, height: number) => object;
      Point: new (x: number, y: number) => object;
      MarkerImage: new (src: string, size: object, options?: { offset?: object }) => object;
      Marker: new (options: {
        map: MapInstance;
        position: MapCoordinate;
        clickable?: boolean;
        image?: object;
        title?: string;
      }) => MapMarker;
      CustomOverlay: new (options: {
        map: MapInstance;
        position: MapCoordinate;
        content: string | HTMLElement;
        yAnchor?: number;
        zIndex?: number;
      }) => MapOverlay;
      services: {
        Status: { OK: string; ZERO_RESULT: string; ERROR: string };
        Places: new () => {
          keywordSearch(
            keyword: string,
            callback: (results: KakaoPlaceResult[], status: string) => void,
            options?: { size?: number; location?: MapCoordinate; radius?: number },
          ): void;
        };
        Geocoder: new () => KakaoGeocoder;
      };
      event: {
        addListener(
          target: MapInstance | MapMarker,
          eventName: string,
          callback: (event?: { latLng: MapCoordinate }) => void,
        ): void;
        removeListener(
          target: MapInstance | MapMarker,
          eventName: string,
          callback: (event?: { latLng: MapCoordinate }) => void,
        ): void;
      };
    };
  }
  interface Window {
    kakao?: Kakao;
  }
}
