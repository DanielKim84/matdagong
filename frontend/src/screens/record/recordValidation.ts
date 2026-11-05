import { isMyTaster, type Place } from "../../models/place";
import type { Coordinates } from "../../utils/geo";
import { REASON_MAX, REASON_MIN, isSameKakaoPlace, type RecordStep } from "./recordModel";

type RecordCheckInput = {
  isEditing: boolean;
  places: Place[];
  selectedPlace: KakaoPlaceResult | null;
  address: string;
  coordinates: Coordinates | null;
  shouldSearchConversionPlace: boolean;
  conversionSearchName: string;
  convertFromPlaceId: string | null;
  hasSelectedLikedPlace: boolean;
  isVisitConfirmed: boolean;
  isBusy: boolean;
  photoCount: number;
  reason: string;
};

/** 단계별 필수값을 검사해 문제가 있으면 안내 문구를, 없으면 빈 문자열을 돌려줍니다. */
export function recordStepError(step: RecordStep, input: RecordCheckInput): string {
  if (step === "place") return placeStepError(input);
  if (step === "media") {
    if (input.isBusy) return "사진을 준비하고 있어요. 잠시만 기다려 주세요.";
    if (input.photoCount === 0) return "맛집 사진을 한 장 이상 등록해 주세요.";
  }
  if (step === "story") {
    if (input.reason.trim().length < REASON_MIN) return `추천 이유를 ${REASON_MIN}글자 이상 남겨주세요.`;
    if (input.reason.length > REASON_MAX) return `추천 이유는 ${REASON_MAX}자까지 남길 수 있어요.`;
  }
  return "";
}

function placeStepError({
  isEditing,
  places,
  selectedPlace,
  address,
  coordinates,
  shouldSearchConversionPlace,
  conversionSearchName,
  convertFromPlaceId,
  hasSelectedLikedPlace,
  isVisitConfirmed,
}: RecordCheckInput): string {
  if (!selectedPlace || !address.trim() || !coordinates) return "카카오 지도에서 실제 장소를 검색해 선택해 주세요.";
  if (
    shouldSearchConversionPlace &&
    conversionSearchName &&
    !selectedPlace.place_name.replaceAll(" ", "").includes(conversionSearchName.replaceAll(" ", ""))
  ) {
    return `‘${conversionSearchName}’와 같은 장소를 선택해 주세요.`;
  }
  if (
    !isEditing &&
    places.some((place) => isSameKakaoPlace(place, selectedPlace.id) && place.tasters.some(isMyTaster))
  ) {
    return "이미 내 맛집으로 등록한 장소예요. 다른 카카오 장소를 선택해 주세요.";
  }
  if ((convertFromPlaceId || hasSelectedLikedPlace) && !isVisitConfirmed) {
    return "이 장소에 직접 방문한 뒤 기록하는 경우에만 내 맛집에서 전환할 수 있어요.";
  }
  return "";
}
