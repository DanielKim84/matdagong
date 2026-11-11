/**
 * 지도 마커(MapCanvas)와 맛객 핀(BrandAssets의 TasterMapMarker)이 같은 모양을 쓰도록 SVG 원본을 한곳에 둡니다.
 * 지도 마커는 카카오 CustomOverlay에 DOM으로 넣으므로 React 요소 대신 문자열로 보관합니다.
 */

/**
 * 모든 핀 마커의 바깥 모양(viewBox 0 0 43 53)입니다. 지름 36 원(중심 21.5, 20.5) 아래에 짧은 꼬리를 붙인 모양이라
 * 원 안의 맛객 사진·캐릭터 위치는 그대로입니다.
 */
export const MARKER_SHELL_PATH = "M21.5 47L16.24 37.71A18 18 0 1 1 26.76 37.71Z";

/** 나만 보는 내 기록 핀의 표식(자물쇠)입니다. 체크 표식 대신 붙입니다. */
export const LOCK_BADGE_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 11h12v10H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3"/></svg>';

/** 믿고 가는 맛객 핀의 별 그림입니다. 구독 중이면 하트 표식 안에, 아니면 주황 바탕 표식(.taster-map-marker-trust) 안에 넣습니다. */
export const TRUST_BADGE_SVG =
  '<svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/></svg>';

/** 기호 마커(내 지도)의 종류입니다. 가볼 곳(하트), 다녀온 곳(체크)입니다. */
export type SymbolMarkerKind = "liked" | "visited";

/** 기호 마커 안쪽 아이콘입니다. 하트는 채우고, 체크는 선으로 그립니다(app.css의 마커 규칙). */
const SYMBOL_GLYPHS: Record<SymbolMarkerKind, string> = {
  liked:
    '<svg viewBox="0 0 24 24"><path d="M20.8 8.8c0 4.1-8.8 10-8.8 10s-8.8-5.9-8.8-10A4.8 4.8 0 0 1 12 6.2a4.8 4.8 0 0 1 8.8 2.6Z"/></svg>',
  visited: '<svg viewBox="0 0 24 24"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
};

/** 기호 마커 버튼 안에 넣을 HTML입니다. 지도와 마커 안내 시트가 같이 씁니다. */
export function symbolMarkerHtml(kind: SymbolMarkerKind): string {
  return `<svg class="map-category-marker-shell" viewBox="0 0 43 53" aria-hidden="true"><path d="${MARKER_SHELL_PATH}"/></svg><span class="map-category-marker-glyph" aria-hidden="true">${SYMBOL_GLYPHS[kind]}</span>`;
}
