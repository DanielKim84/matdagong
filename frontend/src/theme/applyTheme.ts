import { DEFAULT_THEME_ID, THEME_SCHEDULE, findTheme, type ThemeDefinition, type ThemeSchedule } from "./themes";

const PREVIEW_PARAM = "theme";
const PREVIEW_STORAGE_KEY = "matdagong.theme.preview";
const FONT_LINK_ID = "matdagong-theme-font";

/** 한국 시간 기준 날짜(YYYY-MM-DD)입니다. 테마 기간은 서비스 지역 날짜로 판단합니다. */
function koreanDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function scheduledTheme(now: Date, schedule: readonly ThemeSchedule[] = THEME_SCHEDULE): string | undefined {
  const today = koreanDate(now);
  return schedule.find((entry) => entry.start <= today && today < entry.end && findTheme(entry.theme))?.theme;
}

/**
 * `?theme=<id>` 미리 보기를 현재 탭에 기억합니다. 등록된 테마 id만 받으므로 주소로 임의 CSS를 넣을 수 없습니다.
 * `?theme=auto`는 미리 보기를 지웁니다.
 */
function previewTheme(): string | undefined {
  try {
    const requested = new URLSearchParams(window.location.search).get(PREVIEW_PARAM);
    if (requested === "auto") sessionStorage.removeItem(PREVIEW_STORAGE_KEY);
    else if (findTheme(requested)) sessionStorage.setItem(PREVIEW_STORAGE_KEY, requested!);
    return findTheme(sessionStorage.getItem(PREVIEW_STORAGE_KEY))?.id;
  } catch {
    return undefined;
  }
}

/** 미리 보기 → 배포 설정(VITE_APP_THEME) → 기간 예약 → 기본 테마 순서로 적용할 테마를 고릅니다. */
export function resolveTheme(now = new Date()): ThemeDefinition {
  const id =
    previewTheme() ??
    findTheme(import.meta.env.VITE_APP_THEME)?.id ??
    scheduledTheme(now) ??
    DEFAULT_THEME_ID;
  return findTheme(id) ?? findTheme(DEFAULT_THEME_ID)!;
}

export function applyTheme(theme: ThemeDefinition = resolveTheme()): void {
  const root = document.documentElement;
  root.dataset.theme = theme.id;

  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.themeColor);

  const existing = document.getElementById(FONT_LINK_ID) as HTMLLinkElement | null;
  if (!theme.fontStylesheet) {
    existing?.remove();
    return;
  }
  if (existing?.href === theme.fontStylesheet) return;
  const link = existing ?? document.createElement("link");
  link.id = FONT_LINK_ID;
  link.rel = "stylesheet";
  link.href = theme.fontStylesheet;
  if (!existing) document.head.appendChild(link);
}
