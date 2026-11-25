import Icon from "../../components/Icon";

/**
 * 위치 권한이 꺼져 있을 때 발견 위쪽에 두는 안내(보드 18-01): 무엇이 안 되고 무엇은 되는지, 위치 켜기 · 직접 지역 선택.
 * 권한이 이미 거부된 뒤에는 브라우저가 다시 묻지 않으므로 "위치 켜기"는 설정에서 켜는 방법을 알려 주고,
 * 켜면 지도(useMyLocation)가 바로 내 위치를 잡아 이 안내도 사라집니다.
 */
export default function LocationDeniedCard({
  onEnable,
  onPickRegion,
}: {
  onEnable: () => void;
  onPickRegion: () => void;
}) {
  return (
    <section className="r-location-denied" aria-labelledby="location-denied-title">
      <span className="r-location-denied__icon" aria-hidden="true">
        <Icon name="pin-off" />
      </span>
      <h2 id="location-denied-title">위치 정보를 사용할 수 없어요</h2>
      <p>지금 위치로 새 방문을 확인하는 기능은 제한돼요. 이미 다녀온 곳은 위치 없이도 기록할 수 있어요.</p>
      <div className="r-location-denied__note">
        <Icon name="info" />
        <span>
          <b>일부 기능이 제한돼요</b>
          <small>가까운 순 정렬, 가게에서 빠른 저장 등은 위치 권한을 켠 뒤 쓸 수 있어요.</small>
        </span>
      </div>
      <div className="r-location-denied__actions">
        <button type="button" className="r-button r-button--primary r-button--block" onClick={onEnable}>
          <Icon name="route" />
          위치 켜기
        </button>
        <button type="button" className="r-button r-button--secondary r-button--block" onClick={onPickRegion}>
          <Icon name="map" />
          직접 지역 선택
        </button>
      </div>
    </section>
  );
}
