import { useState } from "react";
import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import type { Place } from "../../models/place";
import { kakaoPlaceUrl, openDirections } from "../../utils/placeLinks";
import { hasCoordinates } from "./placeRecords";
import PlaceMiniMap from "./PlaceMiniMap";
import PlaceReportScreen from "./PlaceReportScreen";

/**
 * 모든 맛객이 함께 보는 가게 "위치"(보드 09-04): 주소와 복사, 전화와 코랄 동그라미 걸기 버튼, 작은 위치 지도,
 * 카카오맵에서 보기 | 길찾기, 고른 맛객이 남긴 이용 정보 칩, 맨 아래 전체 폭 "정보 제보"입니다.
 */
export default function PlaceInfo({ place, conditions }: { place: Place; conditions: string[] }) {
  const { actions } = useAppData();
  const [isReportOpen, setIsReportOpen] = useState(false);
  const phone = place.providerPhone?.trim();
  const altAddress = [place.roadAddress, place.lotAddress].find((address) => address && address !== place.address);

  const notify = (message: string) => actions.notify({ kind: "info", title: "맛다공에서 알려드려요", message });

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(place.address);
      notify("주소를 복사했어요.");
    } catch {
      notify("주소를 길게 눌러 복사해 주세요.");
    }
  }

  return (
    <>
      <section className="r-place-section r-place-location" aria-labelledby="place-info-title">
        <h2 className="r-place-section__title" id="place-info-title">
          위치
        </h2>
        <div className="r-place-info__row">
          <Icon name="pin" />
          <span className="r-place-info__text">
            {place.address || "주소 정보가 없어요"}
            {altAddress && <small>{altAddress}</small>}
          </span>
          {place.address && (
            <button type="button" className="r-place-info__action" onClick={copyAddress} aria-label="주소 복사">
              <Icon name="copy" />
            </button>
          )}
        </div>
        <div className="r-place-info__row">
          <Icon name="phone" />
          {phone ? (
            <>
              <span className="r-place-info__text">{phone}</span>
              <a className="r-place-info__action is-call" href={`tel:${phone}`} aria-label={`전화 걸기 ${phone}`}>
                <Icon name="phone" />
              </a>
            </>
          ) : (
            <span className="r-place-info__text r-muted">전화번호 정보가 없어요</span>
          )}
        </div>

        <PlaceMiniMap place={place} className="r-place-location__map" />
        <div className="r-place-location__buttons">
          <a className="r-button r-button--secondary" href={kakaoPlaceUrl(place)} target="_blank" rel="noreferrer">
            <Icon name="external" />
            카카오맵에서 보기
          </a>
          <button
            type="button"
            className="r-button r-button--primary"
            onClick={() => openDirections(place)}
            disabled={!hasCoordinates(place)}
          >
            <Icon name="route" />
            길찾기
          </button>
        </div>
      </section>

      {conditions.length > 0 && (
        <section className="r-place-section" aria-labelledby="place-conditions-title">
          <h2 className="r-place-section__title" id="place-conditions-title">
            맛객이 남긴 이용 정보
          </h2>
          <div className="r-place-conditions">
            {conditions.map((condition) => (
              <span key={condition}>{condition}</span>
            ))}
          </div>
        </section>
      )}

      <div className="r-place-section r-place-report">
        <button
          type="button"
          className="r-button r-button--secondary r-button--block"
          onClick={() => setIsReportOpen(true)}
        >
          <Icon name="alert" />
          정보 제보
        </button>
      </div>
      {isReportOpen && <PlaceReportScreen place={place} onClose={() => setIsReportOpen(false)} />}
    </>
  );
}
