import { useEffect, useState } from "react";
import { getPlaces } from "../services/places";
import type { Place, Screen } from "../models/place";
import { errorMessage } from "../utils/errorMessage";

const SEARCH_DEBOUNCE_MS = 250;

/**
 * 지도·목록의 공개 장소와 검색어입니다. 검색어가 바뀌거나 retry를 부르면 다시 받고,
 * 지도 화면을 떠나면 검색어를 비웁니다.
 */
export function usePlaceSearch(accessToken: string, screen: Screen) {
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    // 지도 검색 입력은 짧게 모아서 보내고, 화면 이동이나 새 검색이 오면 이전 요청을 취소합니다.
    const controller = new AbortController();
    setIsLoading(true);
    const timeout = window.setTimeout(
      () => {
        getPlaces(accessToken, query.trim(), controller.signal)
          .then((result) => {
            setPlaces(result);
            setError("");
          })
          .catch((cause: unknown) => {
            if (!controller.signal.aborted) setError(errorMessage(cause, "맛집을 불러오지 못했어요."));
          })
          .finally(() => {
            if (!controller.signal.aborted) setIsLoading(false);
          });
      },
      query ? SEARCH_DEBOUNCE_MS : 0,
    );
    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [query, retryCount, accessToken]);

  useEffect(() => {
    if (screen !== "map") setQuery("");
  }, [screen]);

  return {
    places,
    setPlaces,
    query,
    setQuery,
    isLoading,
    error,
    retry: () => setRetryCount((current) => current + 1),
  };
}
