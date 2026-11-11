import { useState } from "react";
import { useAppData } from "../app/AppData";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { ApiError } from "../services/http";
import { searchNearbyKakaoPlaces } from "../services/kakao";
import { MY_ACTIVITY_CHANGED_EVENT, checkQuickPlaceDuplicate, saveQuickPlaceDraft } from "../services/places";
import { VISIT_RADIUS_LABEL, VISIT_RADIUS_METERS } from "../models/place";
import { errorMessage } from "../utils/errorMessage";
import { formatDistance } from "../utils/format";
import { distanceMeters, kakaoPlaceAddress, kakaoPlaceCoordinates } from "../utils/geo";
import Icon from "./Icon";
import { useNotificationDialog } from "./NotificationDialog";
import SearchHighlight from "./SearchHighlight";
import Sheet from "./Sheet";

/**
 * 장소 검색만 거쳐 임시 저장하며, 매장에 머무는 동안 빠르게 기록할 수 있습니다.
 * 기록하기와 같은 기준(VISIT_RADIUS_METERS)으로 지금 위치 근처 가게만 저장합니다. 시트를 열면 바로 위치를 확인합니다.
 */
export default function QuickPlaceSheet({ onClose }: { onClose: () => void }) {
  const { accessToken } = useAppData();
  const { alert } = useNotificationDialog();
  const { location, locationMessage, refreshLocation } = useCurrentLocation(
    `현재 위치 ${VISIT_RADIUS_LABEL} 안의 장소만 저장할 수 있어요.`,
  );
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [results, setResults] = useState<KakaoPlaceResult[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState("");

  async function search() {
    if (query.trim().length < 2) {
      setError("가게 이름을 두 글자 이상 입력해 주세요.");
      return;
    }
    if (!location) {
      setError("현재 위치를 먼저 확인해 주세요.");
      return;
    }
    setIsBusy(true);
    setError("");
    try {
      const nearby = await searchNearbyKakaoPlaces(query.trim(), location, VISIT_RADIUS_METERS);
      setResults(nearby);
      setSearchedQuery(query.trim());
      if (!nearby.length)
        setError(`${VISIT_RADIUS_LABEL} 안에서 장소를 찾지 못했어요. 가게 근처에서 다시 검색해 주세요.`);
    } catch (cause) {
      setError(errorMessage(cause, "장소를 검색하지 못했어요."));
    } finally {
      setIsBusy(false);
    }
  }

  async function savePlace(place: KakaoPlaceResult) {
    setIsBusy(true);
    setError("");
    try {
      const duplicate = await checkQuickPlaceDuplicate(accessToken, place);
      if (duplicate.alreadyRegistered || duplicate.alreadySaved) {
        const isRegistered = duplicate.alreadyRegistered;
        await alert({
          title: isRegistered ? "이미 기록한 가게예요" : "이미 빠른 저장에 있는 가게예요",
          message: isRegistered
            ? `${duplicate.placeName ?? place.place_name}은(는) 이미 내가 기록한 맛집이에요.`
            : `${duplicate.placeName ?? place.place_name}은(는) 빠른 저장 목록에 이미 있어요.`,
          tone: "info",
        });
        return;
      }
      await saveQuickPlaceDraft(accessToken, place, location);
      window.dispatchEvent(new Event(MY_ACTIVITY_CHANGED_EVENT));
      onClose();
      await alert({
        title: "장소를 먼저 저장했어요",
        message: `${place.place_name}을(를) 저장했어요. 기록하기에서 ‘임시 저장한 장소 이어서 쓰기’를 누르면 기록을 이어서 완성할 수 있어요.`,
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
    <Sheet title="빠른 저장" onClose={onClose} className="r-record-quick">
      <p className="r-record-quick__lead">
        가게에 도착했을 때 장소만 먼저 남겨 두세요. 사진과 추천 이유는 나중에 이어서 쓸 수 있어요.
      </p>
      <label className="r-record-search">
        <Icon name="search" />
        <span className="visually-hidden">가게 이름이나 주소 검색</span>
        <input
          value={query}
          placeholder="가게 이름이나 주소 검색"
          enterKeyHint="search"
          autoComplete="off"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void search();
            }
          }}
        />
        <button type="button" className="r-record-search__submit" disabled={isBusy} onClick={() => void search()}>
          {isBusy ? "찾는 중" : "검색"}
        </button>
      </label>
      {error && (
        <p className="r-record-error" role="status">
          {error}
        </p>
      )}
      {results.length > 0 && (
        <div className="r-record-results">
          <span className="r-record-results__label">지금 있는 곳 근처 · 눌러서 저장</span>
          {results.map((place, index) => {
            const distance = location ? distanceMeters(location, kakaoPlaceCoordinates(place)) : null;
            const category = place.category_name.split(">").at(-1)?.trim() || "장소";
            return (
              <button
                className="r-row r-record-result"
                key={place.id}
                type="button"
                aria-label={`${place.place_name}, 빠른 저장`}
                disabled={isBusy}
                onClick={() => void savePlace(place)}
              >
                <span className={`r-badge-icon ${index === 0 ? "" : "is-quiet"}`}>
                  <Icon name="pin" />
                </span>
                <span className="r-row__copy">
                  <b>
                    <SearchHighlight text={place.place_name} query={searchedQuery} />
                  </b>
                  <small>
                    {[category, kakaoPlaceAddress(place), formatDistance(distance)].filter(Boolean).join(" · ")}
                  </small>
                </span>
                <span className="r-record-result__save">저장</span>
              </button>
            );
          })}
        </div>
      )}
      <div className={`r-record-location ${location ? "is-ready" : ""}`}>
        <Icon name={location ? "check" : "locate"} />
        <span>{locationMessage}</span>
        <button type="button" className="r-text-button" onClick={refreshLocation}>
          {location ? "새로고침" : "다시 확인"}
        </button>
      </div>
    </Sheet>
  );
}
