import { useEffect, useState } from "react";
import { useAppData } from "../app/AppData";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { useRegionName } from "../hooks/useRegionName";
import { ApiError } from "../services/http";
import { findNearbyEateries } from "../services/kakao";
import { MY_ACTIVITY_CHANGED_EVENT, checkQuickPlaceDuplicate, saveQuickPlaceDraft } from "../services/places";
import { VISIT_RADIUS_LABEL, VISIT_RADIUS_METERS, placeNeighborhood } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import { formatDistance, shortCategory } from "../utils/format";
import { distanceMeters, kakaoPlaceAddress, kakaoPlaceCoordinates } from "../utils/geo";
import Icon from "./Icon";
import { useNotificationDialog } from "./NotificationDialog";
import SubScreen from "./SubScreen";

/**
 * 빠른 저장(보드 12-04, 전체 화면): 위 바 "빠른 저장"과 오른쪽 (i), 큰 제목과 설명, 연한 코랄 "현재 위치: 동네" 줄(고른 가게까지 거리),
 * "근처 장소"(지금 위치 1km 안 음식점·카페, 고르기 동그라미), "방문 확인" 체크, 아래 "저장하기"입니다.
 * 장소만 먼저 임시 저장하고, 사진과 추천 이유는 기록하기의 "임시 저장한 장소 이어서 쓰기"로 나중에 완성합니다.
 * 기록하기와 같은 기준(VISIT_RADIUS_METERS)으로 지금 위치 근처 가게만 저장합니다. 화면을 열면 바로 위치를 확인합니다.
 */
export default function QuickPlaceScreen({ onClose }: { onClose: () => void }) {
  const { accessToken, actions } = useAppData();
  const { alert } = useNotificationDialog();
  const { location, locationMessage, refreshLocation } = useCurrentLocation(
    `현재 위치 ${VISIT_RADIUS_LABEL} 안의 장소만 저장할 수 있어요.`,
  );
  const region = useRegionName(location);
  const [places, setPlaces] = useState<KakaoPlaceResult[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hasVisited, setHasVisited] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");
  const selected = places.find((place) => place.id === selectedId);
  const distanceTo = (place: KakaoPlaceResult) =>
    location ? distanceMeters(location, kakaoPlaceCoordinates(place)) : null;

  useEffect(() => {
    if (!location) return;
    let active = true;
    setError("");
    findNearbyEateries(location, VISIT_RADIUS_METERS).then(
      (nearby) => {
        if (!active) return;
        setPlaces(nearby);
        if (!nearby.length)
          setError(`${VISIT_RADIUS_LABEL} 안에서 가게를 찾지 못했어요. 가게 근처에서 다시 열어 주세요.`);
      },
      (cause: unknown) => {
        if (active) setError(errorMessage(cause, "근처 장소를 찾지 못했어요."));
      },
    );
    return () => {
      active = false;
    };
  }, [location]);

  function explain() {
    actions.notify({
      kind: "info",
      title: "빠른 저장이란?",
      message:
        "가게에 머무는 동안 장소만 먼저 남겨 두는 기능이에요. 사진과 추천 이유는 기록하기에서 이어서 쓸 수 있어요.",
    });
  }

  async function save() {
    if (!selected || !hasVisited) return;
    setIsBusy(true);
    setError("");
    try {
      const duplicate = await checkQuickPlaceDuplicate(accessToken, selected);
      if (duplicate.alreadyRegistered || duplicate.alreadySaved) {
        const isRegistered = duplicate.alreadyRegistered;
        await alert({
          title: isRegistered ? "이미 기록한 가게예요" : "이미 빠른 저장에 있는 가게예요",
          message: isRegistered
            ? `${duplicate.placeName ?? selected.place_name}은(는) 이미 내가 기록한 맛집이에요.`
            : `${duplicate.placeName ?? selected.place_name}은(는) 빠른 저장 목록에 이미 있어요.`,
          tone: "info",
        });
        return;
      }
      await saveQuickPlaceDraft(accessToken, selected, location);
      window.dispatchEvent(new Event(MY_ACTIVITY_CHANGED_EVENT));
      onClose();
      await alert({
        title: "장소를 먼저 저장했어요",
        message: `${selected.place_name}을(를) 저장했어요. 기록하기에서 ‘임시 저장한 장소 이어서 쓰기’를 누르면 기록을 이어서 완성할 수 있어요.`,
        tone: "success",
      });
    } catch (cause) {
      const message = errorMessage(cause, "장소를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      // 확인과 저장 사이에 다른 기기에서 같은 장소를 저장했다면 서버가 409로 알려 줍니다.
      if (cause instanceof ApiError && cause.status === 409) {
        await alert({
          title: message.includes("이미 맛집으로 등록된") ? "이미 맛집으로 등록됐어요" : "이미 빠른 저장에 있어요",
          message,
          tone: "info",
        });
      } else {
        setError(message);
      }
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <SubScreen
      title="빠른 저장"
      onClose={onClose}
      className="r-quick-screen"
      right={
        <button type="button" className="r-icon-button" onClick={explain} aria-label="빠른 저장 안내">
          <Icon name="info" />
        </button>
      }
      footer={
        <button
          type="button"
          className="r-button r-button--primary"
          disabled={!selected || !hasVisited || isBusy}
          onClick={() => void save()}
        >
          {isBusy ? "저장하고 있어요…" : "저장하기"}
        </button>
      }
    >
      <div className="r-record-title">
        <h2 className="r-display">
          지금 방문한 가게를
          <br />
          간단히 기록해 보세요.
        </h2>
        <p className="r-muted">
          가게 반경 {VISIT_RADIUS_LABEL} 안에서만 빠른 저장이 가능해요.
          <br />
          추천 기록과 달리, 방문 사실을 간단히 남기는 기능이에요.
        </p>
      </div>

      {location ? (
        <p className="r-quick-screen__here">
          <Icon name="locate" />
          <b>현재 위치: {region || "확인 중"}</b>
          {selected && <span>가게까지 {formatDistance(distanceTo(selected))}</span>}
        </p>
      ) : (
        <div className="r-record-location">
          <Icon name="locate" />
          <span>{locationMessage}</span>
          <button type="button" className="r-text-button" onClick={refreshLocation}>
            다시 확인
          </button>
        </div>
      )}

      {places.length > 0 && (
        <section className="r-quick-screen__part" aria-labelledby="quick-nearby-title">
          <h3 id="quick-nearby-title">근처 장소</h3>
          <div className="r-record-results" role="radiogroup" aria-label="근처 장소">
            {places.map((place) => {
              const isOn = place.id === selectedId;
              return (
                <button
                  type="button"
                  role="radio"
                  aria-checked={isOn}
                  key={place.id}
                  className={`r-record-result ${isOn ? "is-on" : ""}`}
                  onClick={() => setSelectedId(place.id)}
                >
                  <span className="r-record-result__thumb" aria-hidden="true">
                    <Icon name={/카페|디저트|베이커리/.test(place.category_name) ? "coffee" : "fork"} />
                  </span>
                  <span className="r-record-result__copy">
                    <b>{place.place_name}</b>
                    <small>
                      {[
                        shortCategory(place.category_name),
                        placeNeighborhood({ address: kakaoPlaceAddress(place), lotAddress: null }),
                        formatDistance(distanceTo(place)),
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                  <span className="r-quick-screen__radio" aria-hidden="true">
                    <Icon name="check" />
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <section className="r-quick-screen__part" aria-labelledby="quick-visit-title">
        <h3 id="quick-visit-title">방문 확인</h3>
        <label className="r-quick-screen__visit">
          <input type="checkbox" checked={hasVisited} onChange={(event) => setHasVisited(event.target.checked)} />
          <span className="r-quick-screen__box" aria-hidden="true">
            <Icon name="check" />
          </span>
          오늘 이 가게를 방문했어요.
        </label>
      </section>

      {error && (
        <p className="r-error-box" role="status">
          {error}
        </p>
      )}
    </SubScreen>
  );
}
