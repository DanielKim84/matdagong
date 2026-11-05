import { useState } from "react";
import { useAppData } from "../../app/AppData";
import Icon from "../../components/Icon";
import type { Place } from "../../models/place";
import { kakaoPlaceUrl } from "../../utils/placeLinks";
import PlaceReportSheet from "./PlaceReportSheet";

/** 모든 맛객이 함께 보는 가게 기본 정보(주소·전화·카카오맵). 맛객이 직접 남긴 내용은 맛객 기록에서 보여 줍니다. */
export default function PlaceInfo({ place }: { place: Place }) {
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
    <section className="r-place-section" aria-labelledby="place-info-title">
      <h2 className="r-place-section__title" id="place-info-title">
        가게 정보
      </h2>
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

      <button type="button" className="r-place-report" onClick={() => setIsReportOpen(true)}>
        잘못된 정보 알려주기
      </button>
      {isReportOpen && <PlaceReportSheet place={place} onClose={() => setIsReportOpen(false)} />}
    </section>
  );
}
