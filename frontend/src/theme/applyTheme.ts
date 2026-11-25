import { DEFAULT_THEME_ID, findTheme } from "./themes";

export function applyTheme(): void {
  const theme = findTheme(import.meta.env.VITE_APP_THEME) ?? findTheme(DEFAULT_THEME_ID);
  if (!theme) return;
  const root = document.documentElement;
  root.dataset.theme = theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.themeColor);
}
