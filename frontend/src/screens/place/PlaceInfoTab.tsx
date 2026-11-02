import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import type { Place } from "../../models/place";
import { kakaoPlaceUrl } from "../../utils/placeLinks";
import { countValues, type PlaceRecord } from "./placeRecords";

/** 맛집 상세의 정보 탭. 주소·전화·카카오맵과 맛객들이 확인한 방문 정보를 보여 줍니다. */
export default function PlaceInfoTab({ place, records }: { place: Place; records: PlaceRecord[] }) {
  const { actions } = useAppData();
  const phone = place.providerPhone?.trim();
  const altAddress = [place.roadAddress, place.lotAddress].find((address) => address && address !== place.address);
  const conditionCounts = countValues(records, (record) => record.visitConditions);
  // 맛객 기록에 방문 정보가 없을 때만 장소에 저장된 방문 정보를 보여 줍니다.
  const placeConditions = conditionCounts.length ? [] : (place.visitConditions ?? []);

  const notify = (message: string, title = "맛다공에서 알려드려요") => actions.notify({ kind: "info", title, message });

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(place.address);
      notify("주소를 복사했어요.");
    } catch {
      notify("주소를 길게 눌러 복사해 주세요.");
    }
  }

  return (
    <section className="r-place-section" aria-label="매장 정보">
      <span className="r-label">매장 정보</span>
      <div className="r-card r-place-info">
        <div className="r-place-info__row">
          <Icon name="pin" />
          <span className="r-place-info__text">
            {place.address || "주소 정보가 없어요"}
            {altAddress && <small>{altAddress}</small>}
          </span>
          {place.address && (
            <button type="button" onClick={copyAddress}>
              복사
            </button>
          )}
        </div>
        <div className="r-place-info__row">
          <Icon name="phone" />
          {phone ? (
            <a className="r-place-info__text" href={`tel:${phone}`}>
              {phone}
            </a>
          ) : (
            <span className="r-place-info__text r-muted">전화번호 정보가 없어요</span>
          )}
        </div>
        <a className="r-place-info__row" href={kakaoPlaceUrl(place)} target="_blank" rel="noreferrer">
          <Icon name="map" />
          <span className="r-place-info__text">카카오맵에서 보기</span>
          <Icon name="chevron" />
        </a>
      </div>

      <span className="r-label">맛객들이 확인한 방문 정보</span>
      {conditionCounts.length > 0 || placeConditions.length > 0 ? (
        <div className="r-place-pills">
          {conditionCounts.map(({ label, count }) => (
            <span className="r-place-pill" key={label}>
              {label} · {count}명
            </span>
          ))}
          {placeConditions.map((condition) => (
            <span className="r-place-pill" key={condition}>
              {condition}
            </span>
          ))}
        </div>
      ) : (
        <p className="r-place-note">아직 맛객들이 남긴 방문 정보가 없어요.</p>
      )}

      <button
        type="button"
        className="r-place-report"
        onClick={() => notify("잘못된 정보 제보는 준비 중이에요.", "준비 중인 기능이에요")}
      >
        잘못된 정보 알려주기
      </button>
    </section>
  );
}
