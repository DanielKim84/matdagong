/** 커뮤니티 API의 기준 경로입니다. 프로필과 나머지 기능이 오류·204 응답 처리를 함께 사용합니다. */
import { API_BASE_URL, apiRequest, type ApiRequestOptions } from "./http";

export function communityRequest<T>(path: string, accessToken: string, init: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(`${API_BASE_URL}/v1${path}`, accessToken, init);
}
