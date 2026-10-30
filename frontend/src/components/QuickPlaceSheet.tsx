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

/** 장소 검색만 거쳐 임시 저장하며, 매장에 머무는 동안 빠르게 기록할 수 있습니다. */
export default function QuickPlaceSheet({ onClose, accessToken }: {
  onClose: () => void;
  accessToken: string;
}) {
  const { alert } = useNotificationDialog();
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [locationState, setLocationState] = useState("현재 위치를 확인해야 주변 장소를 검색할 수 있어요.");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<KakaoPlaceResult[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const locationStarted = useRef(false);

  function locate() {
    if (!navigator.geolocation) { setLocationState("이 기기에서는 위치를 확인할 수 없어요."); return; }
    setLocationState("현재 위치를 확인하고 있어요.");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setLocation({ latitude: coords.latitude, longitude: coords.longitude });
      setLocationState("현재 위치에서 1km 안의 장소를 검색해요.");
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
          title: alreadyRegistered ? "이미 등록된 가게예요" : "이미 빠른 기록에 저장된 가게예요",
          message: alreadyRegistered
            ? `${duplicate.placeName ?? place.place_name}은(는) 이미 맛집으로 등록되어 있어요.`
            : `${duplicate.placeName ?? place.place_name}은(는) 빠른 장소 기록에 이미 저장되어 있어요.`,
          tone: "info",
          confirmLabel: "확인했어요",
        });
        return;
      }
      await saveQuickPlaceDraft(accessToken, place);
      window.dispatchEvent(new Event(MY_ACTIVITY_CHANGED_EVENT));
      onClose();
      await alert({
        title: "빠른 기록에 저장했어요",
        message: `${place.place_name}을(를) 마이 탭의 빠른 장소 기록에 저장했어요. 나중에 맛집 기록을 이어서 작성할 수 있어요.`,
        tone: "success",
        confirmLabel: "확인했어요",
      });
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "장소를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.";
      if (message.includes("이미 맛집으로 등록된") || message.includes("이미 빠른 기록에 저장된")) {
        await alert({
          title: message.includes("이미 맛집으로 등록된") ? "이미 맛집으로 등록됐어요" : "이미 빠른 기록에 저장됐어요",
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

  return <Sheet title="빠른 장소 기록" onClose={onClose} className="quick-place-sheet">
    <>
    <p className="quick-place-intro">가게에 도착했을 때 장소만 먼저 저장해 두세요. 자세한 추천 이유와 사진은 맛집 등록에서 나중에 이어 쓸 수 있어요.</p>
    <div className={`quick-place-location ${location ? "is-ready" : ""}`}>
      <span className="quick-place-location-art" aria-hidden="true">
        <svg viewBox="0 0 72 56">
          <rect x="1" y="1" width="70" height="54" rx="14" className="quick-map-paper" />
          <path className="quick-map-park" d="M5 8h17v13H5zm42 28h19v13H47z" />
          <path className="quick-map-water" d="M49 4h15v15H49zM8 39h11v11H8z" />
          <path className="quick-map-road-edge" d="M5 30 19 18l13 9L49 12l17 11M8 51l14-14 13 6 12-11 17 5" />
          <path className="quick-map-road" d="M5 30 19 18l13 9L49 12l17 11M8 51l14-14 13 6 12-11 17 5" />
          <path className="quick-map-route" d="m12 39 7-21 13 9 17-15" />
          <path className="quick-map-pin" d="M34 8c-5 0-9 4-9 9 0 7 9 16 9 16s9-9 9-16c0-5-4-9-9-9Z" />
          <circle className="quick-map-pin-core" cx="34" cy="17" r="4" />
          <circle className="quick-map-pin-eye" cx="32.5" cy="16.5" r=".7" />
          <circle className="quick-map-pin-eye" cx="35.5" cy="16.5" r=".7" />
        </svg>
      </span>
      <span>{locationState}</span>
      <button type="button" onClick={locate}>{location ? "위치 새로고침" : "다시 확인"}</button>
    </div>
    <div className="register-place-search quick-place-search"><Icon name="search" /><input value={query} placeholder="가게 이름이나 주소 검색" aria-label="가게 이름이나 주소 검색"
      onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} />
      <button type="button" disabled={busy} onClick={() => void search()}>{busy ? "찾는 중" : "검색"}</button></div>
    {error && <p className="quick-place-error" role="status">{error}</p>}
    <div className="quick-place-results">{results.map((place) => <button className="quick-place-result" key={place.id} type="button" aria-label={`${place.place_name}, 빠른 기록에 저장`} disabled={busy} onClick={() => void savePlace(place)}>
      <span className="quick-place-result-pin"><Icon name="pin" /></span><span className="quick-place-result-copy"><b>{place.place_name}</b><small>{place.road_address_name || place.address_name}</small><em>{place.category_name.split(">").at(-1)?.trim() || "장소"}</em></span><span className="quick-place-result-next"><Icon name="chevron" /></span>
    </button>)}</div>
    <small className="quick-place-storage-note">장소를 저장하면 마이 탭의 빠른 장소 기록에서 확인할 수 있어요.</small>
    </>
  </Sheet>;
}
