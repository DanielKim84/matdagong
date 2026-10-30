import { useEffect, useRef, useState } from "react";
import Sheet from "./Sheet";
import Icon from "./Icon";
import { searchKakaoPlaces } from "../services/kakao";
import { checkQuickPlaceDuplicate, saveQuickPlaceDraft } from "../services/places";
import { useNotificationDialog } from "./NotificationDialog";
import { MY_ACTIVITY_CHANGED_EVENT } from "../services/places";
import { distanceMeters, kakaoPlaceCoordinates, type Coordinates } from "../utils/geo";

// 맛집 등록 화면과 같은 기준으로 현재 위치 1km 안의 장소만 저장합니다.
const RADIUS_METERS = 1000;

/** 검색어와 겹치는 부분을 강조합니다. */
function highlight(text: string, query: string) {
  const keyword = query.trim();
  const at = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : -1;
  if (at < 0) return text;
  return <>{text.slice(0, at)}<mark>{text.slice(at, at + keyword.length)}</mark>{text.slice(at + keyword.length)}</>;
}

/** 장소 검색만 거쳐 임시 저장하며, 매장에 머무는 동안 빠르게 기록할 수 있습니다. */
export default function QuickPlaceSheet({ onClose, accessToken }: {
  onClose: () => void;
  accessToken: string;
}) {
  const { alert } = useNotificationDialog();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState("현재 위치를 확인해야 주변 장소를 검색할 수 있어요.");
  const [query, setQuery] = useState("");
  const [searchedQuery, setSearchedQuery] = useState("");
  const [results, setResults] = useState<KakaoPlaceResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locationStarted = useRef(false);

  function locate() {
    if (!navigator.geolocation) { setLocationState("이 기기에서는 위치를 확인할 수 없어요."); return; }
    setLocationState("현재 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocation({ latitude: coords.latitude, longitude: coords.longitude });
      setLocationState("현재 위치 1km 안의 장소만 저장할 수 있어요.");
    }, () => setLocationState("주변 장소를 찾으려면 위치 권한을 허용해 주세요."),
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  }

  // 팝업을 열면 위치 권한을 확인하고, 허용된 경우 바로 주변 검색을 준비합니다.
  useEffect(() => {
    if (locationStarted.current) return;
    locationStarted.current = true;
    locate();
  }, []);

  async function search() {
    if (query.trim().length < 2) { setError("가게 이름을 두 글자 이상 입력해 주세요."); return; }
    if (!location) { setError("현재 위치를 먼저 확인해 주세요."); return; }
    setBusy(true); setError("");
    try {
      const nearby = (await searchKakaoPlaces(query.trim(), location, RADIUS_METERS))
        .filter((place) => distanceMeters(location, kakaoPlaceCoordinates(place)) <= RADIUS_METERS);
      setResults(nearby);
      setSearchedQuery(query.trim());
      if (!nearby.length) setError("1km 안에서 장소를 찾지 못했어요. 가게 근처에서 다시 검색해 주세요.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "장소를 검색하지 못했어요."); }
    finally { setBusy(false); }
  }

  async function savePlace(place: KakaoPlaceResult) {
    setBusy(true);
    setError("");
    try {
      const duplicate = await checkQuickPlaceDuplicate(accessToken, place);
      if (duplicate.alreadyRegistered || duplicate.alreadySaved) {
        const alreadyRegistered = duplicate.alreadyRegistered;
        await alert({
          title: alreadyRegistered ? "이미 등록된 가게예요" : "이미 빠른 저장에 있는 가게예요",
          message: alreadyRegistered
            ? `${duplicate.placeName ?? place.place_name}은(는) 이미 맛집으로 등록되어 있어요.`
            : `${duplicate.placeName ?? place.place_name}은(는) 빠른 저장 목록에 이미 있어요.`,
          tone: "info",
          confirmLabel: "확인했어요",
        });
        return;
      }
      await saveQuickPlaceDraft(accessToken, place);
      window.dispatchEvent(new Event(MY_ACTIVITY_CHANGED_EVENT));
      onClose();
      await alert({
        title: "장소를 먼저 저장했어요",
        message: `${place.place_name}을(를) 저장했어요. 기록하기에서 ‘임시 저장한 장소 이어서 쓰기’를 누르면 기록을 이어서 완성할 수 있어요.`,
        tone: "success",
        confirmLabel: "확인했어요",
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "장소를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
      if (message.includes("이미 맛집으로 등록된") || message.includes("이미 빠른 기록에 저장된")) {
        await alert({
          title: message.includes("이미 맛집으로 등록된") ? "이미 맛집으로 등록됐어요" : "이미 빠른 저장에 있어요",
          message,
          tone: "info",
          confirmLabel: "확인했어요",
        });
      } else {
        setError(message);
      }
    } finally {
      setBusy(false);
    }
  }

  return <Sheet title="빠른 저장" onClose={onClose} className="r-record-quick">
    <p className="r-record-quick__lead">가게에 도착했을 때 장소만 먼저 남겨 두세요. 사진과 추천 이유는 나중에 이어서 쓸 수 있어요.</p>
    <label className="r-record-search">
      <Icon name="search" />
      <span className="visually-hidden">가게 이름이나 주소 검색</span>
      <input value={query} placeholder="가게 이름이나 주소 검색" enterKeyHint="search" autoComplete="off"
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} />
      <button type="button" className="r-record-search__submit" disabled={busy} onClick={() => void search()}>{busy ? "찾는 중" : "검색"}</button>
    </label>
    {error && <p className="r-record-error" role="status">{error}</p>}
    {results.length > 0 && (
      <div className="r-record-results">
        <span className="r-record-results__label">지금 있는 곳 근처 · 눌러서 저장</span>
        {results.map((place, index) => {
          const distance = location ? Math.round(distanceMeters(location, kakaoPlaceCoordinates(place))) : null;
          const category = place.category_name.split(">").at(-1)?.trim() || "장소";
          return (
            <button className="r-row r-record-result" key={place.id} type="button" aria-label={`${place.place_name}, 빠른 저장`} disabled={busy}
              onClick={() => void savePlace(place)}>
              <span className={`r-badge-icon ${index === 0 ? "" : "is-quiet"}`}><Icon name="pin" /></span>
              <span className="r-row__copy">
                <b>{highlight(place.place_name, searchedQuery)}</b>
                <small>{[category, place.road_address_name || place.address_name, distance !== null ? `${distance}m` : ""].filter(Boolean).join(" · ")}</small>
              </span>
              <span className="r-record-result__save">저장</span>
            </button>
          );
        })}
      </div>
    )}
    <div className={`r-record-location ${location ? "is-ready" : ""}`}>
      <Icon name={location ? "check" : "locate"} />
      <span>{locationState}</span>
      <button type="button" className="r-record-text-button" onClick={locate}>{location ? "새로고침" : "다시 확인"}</button>
    </div>
  </Sheet>;
}
