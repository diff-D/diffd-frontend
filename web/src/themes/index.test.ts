import { describe, expect, test } from "vitest";
import { DEFAULT_THEME, applyTheme, saveThemeName, savedThemeName, themeNames, themes } from ".";

function fakeStyle() {
  const props = new Map<string, string>();
  return { props, setProperty: (name: string, value: string) => void props.set(name, value) };
}

function fakeStorage(initial: Record<string, string> = {}) {
  const items = new Map(Object.entries(initial));
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe("themes", () => {
  test("include diff'D's default and Monkeytype's themes, sorted", () => {
    expect(DEFAULT_THEME).toBe("diffd");
    expect(themes.diffd.main).toBe("#5ee3a8");
    expect(themes.serika_dark.bg).toBe("#323437");
    expect(themeNames.length).toBeGreaterThan(150);
    expect([...themeNames].sort()).toEqual(themeNames);
    for (const name of themeNames) {
      for (const colour of Object.values(themes[name])) {
        expect(colour, name).toMatch(/^#[0-9a-f]{3,8}$/);
      }
    }
  });

  test("applyTheme sets all ten colour variables", () => {
    const style = fakeStyle();
    applyTheme("serika_dark", style);
    expect(style.props.size).toBe(10);
    expect(style.props.get("--bg-color")).toBe("#323437");
    expect(style.props.get("--sub-alt-color")).toBe("#2c2e31");
    expect(style.props.get("--colorful-error-extra-color")).toBe("#7e2a33");
  });

  test("unknown or missing saved themes fall back to the default", () => {
    expect(savedThemeName(fakeStorage())).toBe(DEFAULT_THEME);
    expect(savedThemeName(fakeStorage({ "diffd-theme": "no_such_theme" }))).toBe(DEFAULT_THEME);
    const storage = fakeStorage();
    saveThemeName("nord", storage);
    expect(savedThemeName(storage)).toBe("nord");
    applyTheme("no_such_theme", fakeStyle());
  });
});
