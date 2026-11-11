import { useEffect, useState } from "react";
import { useAppData } from "../../app/AppData";
import { useCurrentLocation } from "../../hooks/useCurrentLocation";
import { kakaoPlaceFromPlace, kakaoPlaceFromQuickDraft, type QuickPlaceDraft } from "../../services/places";
import { clearRegisterDraft, type RegisterDraftForm } from "../../services/registerDraft";
import { VISIT_RADIUS_LABEL, VISIT_RADIUS_METERS, type Place } from "../../models/place";
import { distanceMeters, kakaoPlaceAddress, kakaoPlaceCoordinates, type Coordinates } from "../../utils/geo";
import { hasPlaceHandoff, takePlaceDetailHandoff, takeQuickPlaceHandoff } from "./recordHandoff";
import { isSameKakaoPlace } from "./recordModel";
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
  const { places, likedPlaceIds, accessToken } = useAppData();

  const [selectedPlace, setSelectedPlace] = useState<KakaoPlaceResult | null>(() =>
    draft ? draft.selectedPlace : editPlace ? kakaoPlaceFromPlace(editPlace) : null,
  );
  const [name, setName] = useState(() => (draft ? draft.name : (editPlace?.name ?? "")));
  const [address, setAddress] = useState(() => (draft ? draft.address : (editPlace?.address ?? "")));
  const [coordinates, setCoordinates] = useState<Coordinates | null>(() =>
    draft ? draft.coordinates : editPlace ? { latitude: editPlace.latitude, longitude: editPlace.longitude } : null,
  );
  const [activeDraftId, setActiveDraftId] = useState<string | null>(() => draft?.activeDraftId ?? null);
  const [isVisitConfirmed, setIsVisitConfirmed] = useState(() => draft?.visitedConfirmed ?? false);
  const [isVisitPromptOpen, setIsVisitPromptOpen] = useState(false);
  // 다른 화면이 가게를 정해 넘겼으면 장소 단계를 건너뛰고 사진·메뉴부터 시작합니다.
  const [shouldSkipPlaceStep, setShouldSkipPlaceStep] = useState(false);
  // 수정인데 고른 가게를 알 수 없으면(보관한 입력의 가게 값이 깨진 경우) 장소부터 다시 고르게 합니다.
  const [hasPlaceStep] = useState(() => !isEditing || !selectedPlace);

  const { location, locationMessage, refreshLocation } = useCurrentLocation(
    `직접 방문한 곳만 기록할 수 있도록 현재 위치 ${VISIT_RADIUS_LABEL} 안에서 찾아요.`,
    hasPlaceStep,
  );
  const search = usePlaceSearch({ location, selectedPlace, setError });
  const { drafts, removeDraft } = useQuickDrafts({ accessToken, isEnabled: !isEditing });

  const selectedLikedPlace = selectedPlace
    ? places.find((place) => likedPlaceIds.includes(place.id) && isSameKakaoPlace(place, selectedPlace.id))
    : undefined;
  const existingVenue = selectedPlace ? places.find((place) => isSameKakaoPlace(place, selectedPlace.id)) : undefined;

  // 하트로 저장만 한 장소를 고르면 직접 방문했는지 먼저 확인합니다.
  const selectedLikedPlaceId = selectedLikedPlace?.id;
  useEffect(() => {
    if (selectedLikedPlaceId && !isVisitConfirmed) setIsVisitPromptOpen(true);
  }, [selectedLikedPlaceId, isVisitConfirmed]);

  useEffect(() => {
    // 다른 화면에서 새 등록을 요청했다면 이전에 보관한 입력은 더 이상 복원하지 않습니다.
    if (hasPlaceHandoff()) clearRegisterDraft();
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
   * 장소를 고릅니다. 임시 저장·다른 화면에서 넘어온 장소는 이미 다녀온 근거가 있어
   * 거리 확인을 건너뜁니다(shouldSkipDistanceCheck).
   */
  function choosePlace(
    result: KakaoPlaceResult,
    shouldSkipDistanceCheck = false,
    isVisitAlreadyConfirmed = false,
  ): void {
    // 직접 방문한 장소만 기록하도록 지금 위치 VISIT_RADIUS_METERS 안의 장소만 고를 수 있습니다.
    if (
      !shouldSkipDistanceCheck &&
      (!location || distanceMeters(location, kakaoPlaceCoordinates(result)) > VISIT_RADIUS_METERS)
    ) {
      setError(`현재 위치에서 ${VISIT_RADIUS_LABEL} 안에 있는 장소만 등록할 수 있어요.`);
      return;
    }
    const likedPlace = places.find((place) => likedPlaceIds.includes(place.id) && isSameKakaoPlace(place, result.id));
    search.resetSearch();
    setSelectedPlace(result);
    setIsVisitConfirmed(isVisitAlreadyConfirmed);
    setIsVisitPromptOpen(!!likedPlace && !isVisitAlreadyConfirmed);
    setActiveDraftId(null);
    setName(result.place_name);
    setAddress(kakaoPlaceAddress(result));
    setCoordinates(kakaoPlaceCoordinates(result));
    setError("");
  }

  function chooseQuickDraft(item: QuickPlaceDraft) {
    choosePlace(kakaoPlaceFromQuickDraft(item), true);
    setActiveDraftId(item.providerPlaceId);
  }

  function clearPlace() {
    setSelectedPlace(null);
    setIsVisitConfirmed(false);
    setIsVisitPromptOpen(false);
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

  /** 저장에 성공하면 이어서 쓴 임시 저장 장소를 목록에서 뺍니다. */
  function resetAfterSave() {
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
    selectedLikedPlace,
    isVisitConfirmed,
    isVisitPromptOpen,
    shouldSkipPlaceStep,
    confirmVisit,
    cancelLikedPlaceRegistration,
  };
}
