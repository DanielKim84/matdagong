import type { Place } from "../models/place";

const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api";

// 검색어가 바뀌면 이전 요청을 취소해 늦게 도착한 응답이 최신 결과를 덮지 않게 합니다.
export async function getPlaces(
  search: string,
  signal?: AbortSignal,
): Promise<Place[]> {
  const response = await fetch(
    `${baseUrl}/v1/places${search ? `?q=${encodeURIComponent(search)}` : ""}`,
    { signal },
  );
  if (!response.ok)
    throw new Error("맛집을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  return response.json();
}

export async function getPlace(id: string): Promise<Place> {
  const response = await fetch(
    `${baseUrl}/v1/places/${encodeURIComponent(id)}`,
  );
  if (!response.ok) throw new Error("맛집 정보를 불러오지 못했어요.");
  return response.json();
}
