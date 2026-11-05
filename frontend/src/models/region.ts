/** 법정동 지역 목록(public/data/kr-legal-dong.json)의 시·도 한 칸입니다. */
export type RegionData = { name: string; districts: { name: string; dongs: string[] }[] };

/** 시·도 공식 이름과 예전 이름을 지도 칩에 쓰는 짧은 이름으로 바꾸는 표입니다. */
const SIDO_SHORT_NAMES: Record<string, string> = {
  서울특별시: "서울",
  부산광역시: "부산",
  대구광역시: "대구",
  인천광역시: "인천",
  광주광역시: "광주",
  대전광역시: "대전",
  울산광역시: "울산",
  세종특별자치시: "세종",
  경기도: "경기",
  강원특별자치도: "강원",
  강원도: "강원",
  충청북도: "충북",
  충청남도: "충남",
  전북특별자치도: "전북",
  전라북도: "전북",
  전라남도: "전남",
  경상북도: "경북",
  경상남도: "경남",
  제주특별자치도: "제주",
  제주도: "제주",
};
const SIDO_SHORT_SET = new Set(Object.values(SIDO_SHORT_NAMES));

/** 주소·활동 지역 문자열의 첫 단어를 짧은 시·도 이름(서울, 경기, 제주 …)으로 바꿉니다. 시·도가 아니면 null입니다. */
export function shortSidoName(text: string | null | undefined): string | null {
  const first = text?.trim().split(/\s+/)[0] ?? "";
  return SIDO_SHORT_NAMES[first] ?? (SIDO_SHORT_SET.has(first) ? first : null);
}
