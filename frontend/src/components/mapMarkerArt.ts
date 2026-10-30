import type { MapKind } from "../models/place";

/**
 * 지도 마커(MapCanvas)와 마커 안내(MapScreen, TasterMapMarker)가 같은 모양을 쓰도록 SVG 원본을 한곳에 둡니다.
 * 지도 마커는 카카오 CustomOverlay에 DOM으로 넣으므로 React 요소 대신 문자열로 보관합니다.
 */

/**
 * 모든 핀 마커의 바깥 모양(viewBox 0 0 43 53)입니다. 지름 36 원(중심 21.5, 20.5) 아래에 짧은 꼬리를 붙인 모양이라
 * 원 안의 맛객 사진·캐릭터 위치는 그대로입니다.
 */
export const MARKER_SHELL_PATH = "M21.5 47L16.24 37.71A18 18 0 1 1 26.76 37.71Z";

/** 맛객 얼굴 대신 기호로 표시하는 마커 종류입니다. 나머지 종류는 맛객 핀(TasterMapMarker 모양)으로 그립니다. */
export type CategoryMarkerKind = Extract<MapKind, "liked" | "ad">;

/** 기호 마커의 안쪽 아이콘입니다. */
export const CATEGORY_MARKER_GLYPHS: Record<CategoryMarkerKind, string> = {
  liked: '<svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6Z"/></svg>',
  ad: '<svg viewBox="0 0 24 24"><path d="M3 10h18v10H3zM2 10l2-6h16l2 6M6 4v6m4-6v6m4-6v6m4-6v6M9 14h6v6H9z"/></svg>',
};

/** 기호 마커 버튼 안에 넣을 HTML입니다. */
export function categoryMarkerHtml(kind: CategoryMarkerKind): string {
  return `<svg class="map-category-marker-shell" viewBox="0 0 43 53" aria-hidden="true"><path d="${MARKER_SHELL_PATH}"/></svg><span class="map-category-marker-glyph" aria-hidden="true">${CATEGORY_MARKER_GLYPHS[kind]}</span>`;
}
