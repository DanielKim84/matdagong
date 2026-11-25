/** 기본 테마와 이후 추가할 테마의 브라우저 색상 설정입니다. */
type ThemeDefinition = {
  id: string;
  /** 모바일 브라우저 주소창·상태 표시줄 색(meta theme-color) */
  themeColor: string;
};

export const DEFAULT_THEME_ID = "default";

const THEMES: readonly ThemeDefinition[] = [
  {
    id: DEFAULT_THEME_ID,
    themeColor: "#ffffff",
  },
];

export function findTheme(id: string | null | undefined): ThemeDefinition | undefined {
  return THEMES.find((theme) => theme.id === id);
}
