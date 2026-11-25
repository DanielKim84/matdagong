/** 법정동 지역 목록(public/data/kr-legal-dong.json)의 시·도 한 칸입니다. */
export type RegionData = { name: string; districts: { name: string; dongs: string[] }[] };

/**
 * 시·도 공식 이름(법정동 목록·활동 지역)을 지도 칩에 쓰는 짧은 이름으로 바꾸는 표입니다. 카카오 주소는 처음부터 짧은
 * 이름("서울", "경기")이나 공식 이름으로 오므로 둘 다 알아봅니다. 2026-07-01 광주광역시·전라남도가 합쳐진
 * 전남광주통합특별시는 "전남광주"로 줄입니다(법정 약칭 "광주특별시"는 옛 전남 지역 사람에게 헷갈려서 쓰지 않음).
 * 시·도가 바뀌면 이 표와 public/data/kr-legal-dong.json(내 지역 고르기 목록)을 함께 고칩니다.
 */
const SIDO_SHORT_NAMES: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원특별자치도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전북특별자치도: "전북",
  전남광주통합특별시: "전남광주",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
};
const SIDO_SHORT_SET = new Set(Object.values(SIDO_SHORT_NAMES));

/** 시·도를 늘어놓을 순서(서울 → 광역시 → 도 → 제주, 위 표 순서)에서의 자리입니다. 표에 없으면 맨 뒤입니다. */
export function sidoOrder(name: string): number {
  const index = Object.keys(SIDO_SHORT_NAMES).indexOf(name);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

/** 주소·활동 지역 문자열의 첫 단어를 짧은 시·도 이름(서울, 경기, 제주 …)으로 바꿉니다. 시·도가 아니면 null입니다. */
export function shortSidoName(text: string | null | undefined): string | null {
  const first = text?.trim().split(/\s+/)[0] ?? "";
  return SIDO_SHORT_NAMES[first] ?? (SIDO_SHORT_SET.has(first) ? first : null);
}

/**
 * 활동 지역 한 곳의 짧은 이름표입니다(프로필 편집 칩, 맛객 목록). 시·도만 고른 곳은 "서울", 그 아래까지 고른 곳은
 * 맨 끝 이름("마포구", "연남동")입니다. 저장 값은 법정동 공식 이름을 공백으로 이은 한 줄("서울특별시 마포구 연남동")입니다.
 */
export function regionLabel(region: string): string {
  const parts = region.trim().split(/\s+/);
  if (parts.length === 1) return shortSidoName(parts[0]) ?? parts[0];
  return parts[parts.length - 1];
}

/**
 * 주소(카카오 "서울 마포구 연남동 …" 또는 공식 이름)가 활동 지역 안인지 봅니다. 시·도는 짧은 이름으로 맞추고,
 * 그 아래(시·군·구, 읍·면·동)는 지역에 적힌 이름이 주소에 모두 있어야 합니다. 시·도만 고른 지역이면 같은 시·도면 됩니다.
 */
export function regionContains(region: string, address: string | null | undefined): boolean {
  const regionParts = region.trim().split(/\s+/);
  const addressParts = address?.trim().split(/\s+/) ?? [];
  const sido = shortSidoName(regionParts[0]);
  if (!sido || sido !== shortSidoName(addressParts[0])) return false;
  return regionParts.slice(1).every((part) => addressParts.includes(part));
}

/** 두 활동 지역이 겹치는지(한쪽이 다른 쪽 안에 있으면 겹침). 맛객 탭 "내 지역"에서 맛객 활동 지역과 내 지역을 견줄 때 씁니다. */
export function regionsOverlap(a: string, b: string): boolean {
  return regionContains(a, b) || regionContains(b, a);
}
