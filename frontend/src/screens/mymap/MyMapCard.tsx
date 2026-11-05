import { useState } from "react";
import { useAppData } from "../../app/AppData";
import { go } from "../../app/navigation";
import Icon from "../../components/Icon";
import type { Place } from "../../models/place";
import { categoryLabel } from "../../utils/format";
import { errorMessage } from "../../utils/errorMessage";
import { kakaoPlaceUrl, openDirections } from "../../utils/placeLinks";
import { myMapKindLabel, otherRecordCount, type MyMapPlace } from "./myMapModel";

/**
 * 내 지도 아래쪽에 뜨는 가게 카드입니다. 고른 것이 내 지도의 장소면 종류와 상세로 가는 버튼을,
 * 카카오에서 검색한 가게면 카카오 가게 정보와 "가보고 싶어요" 저장 버튼을 보여 줍니다.
 * 검색한 가게에 맛다공 맛객 기록이 있으면 그 기록을 보러 가는 버튼도 둡니다.
 */
export default function MyMapCard({
  entry,
  searched,
  known,
  onSaved,
  onClose,
}: {
  /** 고른 내 지도 장소. 검색한 가게를 골랐을 때는 그 가게가 이미 내 지도에 있으면 넘깁니다. */
  entry?: MyMapPlace;
  /** 카카오에서 검색해 고른 가게 */
  searched?: KakaoPlaceResult;
  /** 같은 가게가 맛다공에 이미 있으면 그 장소(맛객 기록 수 확인용) */
  known?: Place;
  /** 가보고 싶어요로 저장한 뒤 저장된 장소 ID를 알립니다. */
  onSaved: (placeId: string) => void;
  onClose: () => void;
}) {
  const app = useAppData();
  const [isSaving, setIsSaving] = useState(false);
  const place = entry?.place ?? known;
  const name = searched?.place_name ?? place?.name ?? "";
  const category = categoryLabel(searched?.category_name ?? place?.category);
  const address = searched ? searched.road_address_name || searched.address_name : place?.address;
  const phone = searched?.phone || place?.providerPhone;
  const records = otherRecordCount(known ?? entry?.place);
  const location = searched
    ? { name, latitude: Number(searched.y), longitude: Number(searched.x), providerPlaceId: searched.id }
    : place && { ...place };

  async function saveWish() {
    if (!searched) return;
    setIsSaving(true);
    try {
      const saved = await app.actions.saveWishPlace(searched);
      onSaved(saved.id);
      app.actions.notify({
        kind: "success",
        title: "가볼 곳에 저장했어요",
        message: `‘${name}’을 내 지도에 표시했어요.`,
      });
    } catch (cause) {
      app.actions.notify({
        kind: "error",
        title: "가볼 곳으로 저장하지 못했어요",
        message: errorMessage(cause, "잠시 뒤 다시 시도해 주세요."),
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <article className="r-card r-mymap-card" aria-label={`${name} 가게 정보`}>
      <header className="r-mymap-card__head">
        <div>
          {entry && (
            <span className={`r-tag ${entry.kind === "liked" ? "" : "r-tag--mine"}`}>{myMapKindLabel(entry)}</span>
          )}
          <h2 className="r-display">{name}</h2>
          <p>{[category, address].filter(Boolean).join(" · ")}</p>
        </div>
        <button type="button" className="r-icon-button" aria-label="가게 카드 닫기" onClick={onClose}>
          <Icon name="close" />
        </button>
      </header>

      <div className="r-mymap-card__links">
        {location && (
          <button type="button" className="r-text-button" onClick={() => openDirections(location)}>
            길찾기
          </button>
        )}
        {phone && (
          <a className="r-text-button" href={`tel:${phone}`}>
            전화 {phone}
          </a>
        )}
        {location && (
          <a className="r-text-button" href={kakaoPlaceUrl(location)} target="_blank" rel="noreferrer">
            카카오맵
          </a>
        )}
      </div>

      <div className="r-mymap-card__actions">
        {searched && !entry ? (
          <button
            type="button"
            className="r-button r-button--primary r-button--block"
            disabled={isSaving}
            onClick={() => void saveWish()}
          >
            <Icon name="heart" /> {isSaving ? "저장하는 중…" : "가보고 싶어요"}
          </button>
        ) : (
          place && (
            <button
              type="button"
              className="r-button r-button--secondary r-button--block"
              onClick={() => go("place", place.id)}
            >
              상세 보기
            </button>
          )
        )}
        {records > 0 && known && (
          <button
            type="button"
            className="r-button r-button--secondary r-button--block"
            onClick={() => go("place", known.id)}
          >
            맛객 기록 {records}개 보기
          </button>
        )}
      </div>
    </article>
  );
}
