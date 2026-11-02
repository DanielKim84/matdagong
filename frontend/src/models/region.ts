/** 법정동 지역 목록(public/data/kr-legal-dong.json)의 시·도 한 칸입니다. */
export type RegionData = { name: string; districts: { name: string; dongs: string[] }[] };
