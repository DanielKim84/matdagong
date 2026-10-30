/**
 * 맛다공 화면 테마 목록과 기간 예약입니다.
 *
 * 새 시즌 테마를 추가하는 순서
 * 1. themes/<id>.css 를 만들고 `[data-theme="<id>"]` 안에서 계열 단계 변수(--neutral-*, --brand-* …)를 다시 정의합니다.
 *    단계별 밝기 순서(0 밝음 → 900 어두움)를 지켜야 글자 대비가 유지됩니다.
 * 2. 아래 THEMES에 id, 이름, 브라우저 상단 색, 필요한 글꼴을 등록합니다.
 * 3. themes/index.css 에 CSS 파일을 import합니다.
 * 4. 기간 적용이 필요하면 THEME_SCHEDULE에 시작·종료일을 넣습니다. 기간이 끝나면 자동으로 기본 테마로 돌아갑니다.
 *
 * 미리 보기: 주소 뒤에 `?theme=<id>`를 붙이면 그 탭에서만 해당 테마로 봅니다. `?theme=auto`로 되돌립니다.
 */
export type ThemeDefinition = {
  id: string;
  /** 운영자가 알아보기 위한 이름 */
  label: string;
  /** 모바일 브라우저 주소창·상태 표시줄 색(meta theme-color) */
  themeColor: string;
  /** 테마가 쓰는 웹 글꼴 CSS 주소(Google Fonts css2). 기본 본문 글꼴 Pretendard는 index.html에서 불러옵니다. */
  fontStylesheet?: string;
};

export const DEFAULT_THEME_ID = "default";

export const THEMES: readonly ThemeDefinition[] = [
  {
    id: DEFAULT_THEME_ID,
    label: "기본 · 웜 다이어리",
    themeColor: "#fff8f1",
    fontStylesheet: "https://fonts.googleapis.com/css2?family=Jua&display=swap",
  },
  {
    id: "halloween",
    label: "할로윈",
    themeColor: "#fbf1e3",
    fontStylesheet: "https://fonts.googleapis.com/css2?family=Black+Han+Sans&display=swap",
  },
];

export type ThemeSchedule = {
  theme: string;
  /** 한국 시간 기준 시작일(포함), YYYY-MM-DD */
  start: string;
  /** 한국 시간 기준 종료일(미포함), YYYY-MM-DD. 이 날 0시에 기본 테마로 돌아갑니다. */
  end: string;
};

/**
 * 기간별 자동 적용 목록입니다. 겹치면 위에 적힌 항목이 우선합니다.
 * 예) 10월 한 달 동안 할로윈: { theme: "halloween", start: "2027-10-01", end: "2027-11-01" }
 */
export const THEME_SCHEDULE: readonly ThemeSchedule[] = [];

export function findTheme(id: string | null | undefined): ThemeDefinition | undefined {
  return THEMES.find((theme) => theme.id === id);
}
