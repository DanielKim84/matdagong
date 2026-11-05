import { useEffect, useState } from "react";
import { useAppData } from "../../app/AppData";
import { kakaoPlaceFromPlace, kakaoPlaceFromQuickDraft, type QuickPlaceDraft } from "../../services/places";
import { clearRegisterDraft, type RegisterDraftForm } from "../../services/registerDraft";
import { VISIT_RADIUS_LABEL, type Place } from "../../models/place";
import { distanceMeters, kakaoPlaceCoordinates, type Coordinates } from "../../utils/geo";
import {
  hasPlaceHandoff,
  takeLikeConversionHandoff,
  takePlaceDetailHandoff,
  takeQuickPlaceHandoff,
} from "./recordHandoff";
import { NEARBY_RADIUS_METERS, isSameKakaoPlace } from "./recordModel";
import { useCurrentLocation } from "./useCurrentLocation";
import { usePlaceSearch } from "./usePlaceSearch";
import { useQuickDrafts } from "./useQuickDrafts";

/**
 * 기록할 장소 고르기: 현재 위치·카카오 검색·임시 저장한 장소·다른 화면이 넘긴 장소와,
 * 하트로 저장만 한 장소를 방문 기록으로 바꿀 때의 직접 방문 확인을 맡습니다.
 */
export function useRecordPlace({
  draft,
  editPlace,
  isEditing,
  setError,
}: {
  draft?: RegisterDraftForm;
  editPlace?: Place;
  isEditing: boolean;
  setError: (message: string) => void;
}) {
  const { places, likedPlaceIds, visitedLikedPlaceIds, accessToken } = useAppData();

  const [selectedPlace, setSelectedPlace] = useState<KakaoPlaceResult | null>(() =>
    draft ? draft.selectedPlace : editPlace ? kakaoPlaceFromPlace(editPlace) : null,
  );
  const [name, setName] = useState(() => (draft ? draft.name : (editPlace?.name ?? "")));
  const [address, setAddress] = useState(() => (draft ? draft.address : (editPlace?.address ?? "")));
  const [coordinates, setCoordinates] = useState<Coordinates | null>(() =>
    draft ? draft.coordinates : editPlace ? { latitude: editPlace.latitude, longitude: editPlace.longitude } : null,
  );
  const [activeDraftId, setActiveDraftId] = useState<string | null>(() => draft?.activeDraftId ?? null);
  const [convertFromPlaceId, setConvertFromPlaceId] = useState<string | null>(() => draft?.convertFromPlaceId ?? null);
  const [isVisitConfirmed, setIsVisitConfirmed] = useState(() => draft?.visitedConfirmed ?? false);
  const [isVisitPromptOpen, setIsVisitPromptOpen] = useState(false);
  // 다른 화면이 가게를 정해 넘겼으면 장소 단계를 건너뛰고 사진·메뉴부터 시작합니다.
  const [shouldSkipPlaceStep, setShouldSkipPlaceStep] = useState(false);
  const [shouldSearchConversionPlace, setShouldSearchConversionPlace] = useState(
    () => draft?.conversionNeedsPlaceSearch ?? false,
  );
  const [conversionSearchName, setConversionSearchName] = useState(() => draft?.conversionSearchName ?? "");
  // 수정인데 카카오 장소 ID가 없는 예전 기록이면 장소부터 다시 고르게 합니다.
  const [hasPlaceStep] = useState(() => !isEditing || !selectedPlace);

  const { location, locationMessage, refreshLocation } = useCurrentLocation(hasPlaceStep);
  const search = usePlaceSearch({ location, selectedPlace, setError });
  const { drafts, removeDraft } = useQuickDrafts({ accessToken, isEnabled: !isEditing });

  const selectedLikedPlace = selectedPlace
    ? places.find((place) => likedPlaceIds.includes(place.id) && isSameKakaoPlace(place, selectedPlace.id))
    : undefined;
  const existingVenue = selectedPlace ? places.find((place) => isSameKakaoPlace(place, selectedPlace.id)) : undefined;

  // 하트로 저장만 한 장소를 고르면 직접 방문했는지 먼저 확인합니다.
  const selectedLikedPlaceId = selectedLikedPlace?.id;
  useEffect(() => {
    if (selectedLikedPlaceId && !visitedLikedPlaceIds.includes(selectedLikedPlaceId) && !isVisitConfirmed) {
      setIsVisitPromptOpen(true);
    }
  }, [selectedLikedPlaceId, visitedLikedPlaceIds, isVisitConfirmed]);

  useEffect(() => {
    // 다른 화면에서 새 등록을 요청했다면 이전에 보관한 입력은 더 이상 복원하지 않습니다.
    if (hasPlaceHandoff()) clearRegisterDraft();
    const conversion = takeLikeConversionHandoff();
    if (conversion && "place" in conversion) {
      choosePlace(conversion.place, true, true);
      setConvertFromPlaceId(conversion.sourcePlaceId);
      setShouldSkipPlaceStep(true);
      return;
    }
    if (conversion) {
      setConvertFromPlaceId(conversion.sourcePlaceId);
      setShouldSearchConversionPlace(true);
      setConversionSearchName(conversion.searchName);
      search.setPlaceSearch(conversion.searchName);
      return;
    }
    // 맛집 상세에서 넘어온 가게: 상세가 다녀온 근거를 확인한 뒤에만 넘기므로 바로 사진·메뉴부터 시작합니다.
    const detail = takePlaceDetailHandoff();
    if (detail) {
      choosePlace(detail.place, true, true);
      setShouldSkipPlaceStep(true);
      return;
    }
    // 빠른 기록에서 넘어온 장소는 그 가게에서 저장한 것이라 바로 사진·메뉴부터 시작합니다.
    const quickPlace = takeQuickPlaceHandoff();
    if (quickPlace) {
      choosePlace(quickPlace, true);
      setActiveDraftId(quickPlace.id);
      setShouldSkipPlaceStep(true);
    }
  }, []);

  /**
   * 장소를 고릅니다. 임시 저장·다른 화면에서 넘어온 장소와 하트 전환으로 찾는 장소는 이미 다녀온 근거가 있어
   * 거리 확인을 건너뜁니다(shouldSkipDistanceCheck).
   */
  function choosePlace(
    result: KakaoPlaceResult,
    shouldSkipDistanceCheck = false,
    isVisitAlreadyConfirmed = false,
  ): boolean {
    if (
      !shouldSkipDistanceCheck &&
      (!location || distanceMeters(location, kakaoPlaceCoordinates(result)) > NEARBY_RADIUS_METERS)
    ) {
      setError(`현재 위치에서 ${VISIT_RADIUS_LABEL} 안에 있는 장소만 등록할 수 있어요.`);
      return false;
    }
    const likedPlace = places.find((place) => likedPlaceIds.includes(place.id) && isSameKakaoPlace(place, result.id));
    const hasVisitRecord = isVisitAlreadyConfirmed || (!!likedPlace && visitedLikedPlaceIds.includes(likedPlace.id));
    search.resetSearch();
    setSelectedPlace(result);
    setIsVisitConfirmed(hasVisitRecord);
    setIsVisitPromptOpen(!!likedPlace && !hasVisitRecord);
    if (!shouldSearchConversionPlace) setConvertFromPlaceId(null);
    setActiveDraftId(null);
    setName(result.place_name);
    setAddress(result.road_address_name || result.address_name);
    setCoordinates({ latitude: Number(result.y), longitude: Number(result.x) });
    setError("");
    return true;
  }

  function chooseQuickDraft(item: QuickPlaceDraft) {
    choosePlace(kakaoPlaceFromQuickDraft(item), true);
    setActiveDraftId(item.providerPlaceId);
  }

  function clearPlace() {
    setSelectedPlace(null);
    setIsVisitConfirmed(false);
    setIsVisitPromptOpen(false);
    if (!shouldSearchConversionPlace) setConvertFromPlaceId(null);
    setActiveDraftId(null);
    setName("");
    setAddress("");
    setCoordinates(null);
  }

  function confirmVisit() {
    setIsVisitConfirmed(true);
    setIsVisitPromptOpen(false);
  }

  function cancelLikedPlaceRegistration() {
    clearPlace();
    setError("직접 방문하기 전에는 이 장소의 맛집 기록을 작성할 수 없어요.");
  }

  /** 저장에 성공하면 하트 전환 상태를 비우고, 이어서 쓴 임시 저장 장소를 목록에서 뺍니다. */
  function resetAfterSave() {
    setConvertFromPlaceId(null);
    setShouldSearchConversionPlace(false);
    setConversionSearchName("");
    if (activeDraftId) removeDraft(activeDraftId);
  }

  return {
    hasPlaceStep,
    resetAfterSave,
    location,
    locationMessage,
    refreshLocation,
    placeSearch: search.placeSearch,
    changePlaceSearch: search.changePlaceSearch,
    placeResults: search.placeResults,
    hasSearched: search.hasSearched,
    isSearchingPlaces: search.isSearchingPlaces,
    findPlaces: search.findPlaces,
    choosePlace,
    chooseQuickDraft,
    clearPlace,
    selectedPlace,
    name,
    address,
    coordinates,
    existingVenue,
    drafts,
    activeDraftId,
    convertFromPlaceId,
    selectedLikedPlace,
    shouldSearchConversionPlace,
    conversionSearchName,
    isVisitConfirmed,
    isVisitPromptOpen,
    shouldSkipPlaceStep,
    confirmVisit,
    cancelLikedPlaceRegistration,
  };
}
