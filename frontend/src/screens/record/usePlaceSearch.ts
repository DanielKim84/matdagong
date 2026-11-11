import { useEffect, useRef, useState } from "react";
import { searchNearbyKakaoPlaces } from "../../services/kakao";
import { VISIT_RADIUS_METERS } from "../../models/place";
import { errorMessage } from "../../utils/errorMessage";
import type { Coordinates } from "../../utils/geo";

const SEARCH_DELAY_MS = 450;
const SEARCH_MIN_LENGTH = 2;

/** 현재 위치 1km 안의 카카오 장소를 이름·주소로 찾습니다. 입력을 멈추면 자동으로 찾습니다. */
export function usePlaceSearch({
  location,
  selectedPlace,
  setError,
}: {
  location: Coordinates | null;
  selectedPlace: KakaoPlaceResult | null;
  setError: (message: string) => void;
}) {
  const [placeSearch, setPlaceSearch] = useState("");
  const [placeResults, setPlaceResults] = useState<KakaoPlaceResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  // 늦게 도착한 이전 검색 결과가 최신 결과를 덮지 않도록 요청 순번을 셉니다.
  const searchSeq = useRef(0);

  async function findPlaces(keyword = placeSearch, isQuiet = false) {
    const query = keyword.trim();
    if (query.length < SEARCH_MIN_LENGTH) {
      if (!isQuiet) setError("가게 이름이나 주소를 두 글자 이상 입력해 주세요.");
      return;
    }
    if (!location) {
      if (!isQuiet) setError("현재 위치를 확인한 뒤 주변 장소를 검색해 주세요.");
      return;
    }
    const seq = ++searchSeq.current;
    setIsSearchingPlaces(true);
    setError("");
    try {
      const nearby = await searchNearbyKakaoPlaces(query, location, VISIT_RADIUS_METERS);
      if (seq !== searchSeq.current) return;
      setPlaceResults(nearby);
      setHasSearched(true);
    } catch (cause) {
      if (seq === searchSeq.current) setError(errorMessage(cause, "장소를 찾지 못했어요."));
    } finally {
      if (seq === searchSeq.current) setIsSearchingPlaces(false);
    }
  }

  function changePlaceSearch(value: string) {
    setPlaceSearch(value);
    setHasSearched(false);
    if (!value.trim()) setPlaceResults([]);
  }

  /** 장소를 고르면 진행 중인 검색 결과를 버리고 검색 칸을 비웁니다. */
  function resetSearch() {
    searchSeq.current += 1;
    setIsSearchingPlaces(false);
    setPlaceResults([]);
    setPlaceSearch("");
    setHasSearched(false);
  }

  // 위치가 없거나 이미 장소를 골랐으면 검색하지 않습니다.
  useEffect(() => {
    if (selectedPlace || !location || placeSearch.trim().length < SEARCH_MIN_LENGTH) return;
    const timer = window.setTimeout(() => void findPlaces(placeSearch, true), SEARCH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [placeSearch, location, selectedPlace]);

  return {
    placeSearch,
    changePlaceSearch,
    placeResults,
    hasSearched,
    isSearchingPlaces,
    findPlaces,
    resetSearch,
  };
}
