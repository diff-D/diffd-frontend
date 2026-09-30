import monkeytypeThemes from "./themes.json";

export type Theme = {
  bg: string;
  main: string;
  caret: string;
  sub: string;
  subAlt: string;
  text: string;
  error: string;
  errorExtra: string;
  colorfulError: string;
  colorfulErrorExtra: string;
};

export const DEFAULT_THEME = "diffd";

const DIFFD: Theme = {
  bg: "#15171c",
  main: "#5ee3a8",
  caret: "#5ee3a8",
  sub: "#5c6370",
  subAlt: "#1e2129",
  text: "#d6dae0",
  error: "#ff6b6b",
  errorExtra: "#c24848",
  colorfulError: "#ff6b6b",
  colorfulErrorExtra: "#c24848",
};

/** diff'D's own theme plus Monkeytype's (see scripts/build-themes.mjs). */
export const themes: Record<string, Theme> = {
  ...(monkeytypeThemes as Record<string, Theme>),
  [DEFAULT_THEME]: DIFFD,
};

export const themeNames: string[] = Object.keys(themes).sort();

const CSS_VARS: Record<keyof Theme, string> = {
  bg: "--bg-color",
  main: "--main-color",
  caret: "--caret-color",
  sub: "--sub-color",
  subAlt: "--sub-alt-color",
  text: "--text-color",
  error: "--error-color",
  errorExtra: "--error-extra-color",
  colorfulError: "--colorful-error-color",
  colorfulErrorExtra: "--colorful-error-extra-color",
};

/** Sets the theme's colours as CSS variables (on `<html>` by default). */
export function applyTheme(
  name: string,
  style: Pick<CSSStyleDeclaration, "setProperty"> = document.documentElement.style,
): void {
  const theme = themes[name] ?? themes[DEFAULT_THEME];
  for (const key of Object.keys(CSS_VARS) as (keyof Theme)[]) {
    style.setProperty(CSS_VARS[key], theme[key]);
  }
  // the browser's own bars (a phone's address and tool bars) take the page's colour
  if (typeof document !== "undefined") document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.bg);
}

const STORAGE_KEY = "diffd-theme";

/** The theme remembered by this browser, or the default. Storage may be unavailable. */
export function savedThemeName(storage: Pick<Storage, "getItem"> = localStorage): string {
  try {
    const name = storage.getItem(STORAGE_KEY);
    return name !== null && name in themes ? name : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function saveThemeName(name: string, storage: Pick<Storage, "setItem"> = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, name);
  } catch {
    // private mode or blocked storage: the theme just isn't remembered
  }
}
