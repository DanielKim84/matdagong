import Icon from "../../components/Icon";
import SubScreen from "../../components/SubScreen";
import type { Place } from "../../models/place";
import DiscoverPlaceList from "./DiscoverPlaceList";
import SortToggle from "./SortToggle";
import type { PlaceContext, SortOrder } from "./discoverModel";

/**
 * 지도 목록 펼침(보드 06-02, 전체 화면): "지도에 보이는 곳" 제목, 추천순 | 가까운 순, "지도의 이 지역(연남동) 기록 N곳" 줄과
 * 마커 안내, 지금 지도에 보이는 맛집 사진 목록입니다. 줄을 누르면 바로 맛집 상세로 갑니다.
 */
export default function MapListScreen({
  places,
  ctx,
  region,
  sort,
  canSortByDistance,
  onSortChange,
  onOpen,
  onMarkerGuide,
  onClose,
}: {
  places: Place[];
  ctx: PlaceContext;
  /** 지금 지도 가운데 동네 이름(모르면 빈 문자열) */
  region: string;
  sort: SortOrder;
  canSortByDistance: boolean;
  onSortChange: (sort: SortOrder) => void;
  onOpen: (place: Place) => void;
  onMarkerGuide: () => void;
  onClose: () => void;
}) {
  return (
    <SubScreen title="지도에 보이는 곳" onClose={onClose} className="r-map-list">
      <SortToggle sort={sort} canSortByDistance={canSortByDistance} onSortChange={onSortChange} />
      <p className="r-map-list__count">
        <Icon name="pin" />
        <span>
          지도의 이 지역{region ? `(${region})` : ""} 기록 {places.length}곳
        </span>
        <button type="button" className="r-text-button" onClick={onMarkerGuide}>
          마커 안내
        </button>
      </p>
      <DiscoverPlaceList places={places} ctx={ctx} onOpen={onOpen} />
    </SubScreen>
  );
}
