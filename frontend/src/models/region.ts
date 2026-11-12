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

/** 주소·활동 지역 문자열의 첫 단어를 짧은 시·도 이름(서울, 경기, 제주 …)으로 바꿉니다. 시·도가 아니면 null입니다. */
export function shortSidoName(text: string | null | undefined): string | null {
  const first = text?.trim().split(/\s+/)[0] ?? "";
  return SIDO_SHORT_NAMES[first] ?? (SIDO_SHORT_SET.has(first) ? first : null);
}
