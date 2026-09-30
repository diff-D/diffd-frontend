import { createSignal } from "solid-js";
import { settings } from "../api/client";
import { applyTheme, saveThemeName, savedThemeName, themes } from "../themes";
import { identity } from "./identity";
import { notify } from "./notices";

const [themeName, setThemeName] = createSignal(savedThemeName());

export { themeName };

export function initTheme(): void {
  applyTheme(themeName());
}

/** Shows a theme without choosing it (theme picker hover). */
export function previewTheme(name: string): void {
  applyTheme(name);
}

export function selectTheme(name: string): void {
  if (!(name in themes)) return;
  setThemeName(name);
  applyTheme(name);
  saveThemeName(name);
  if (identity()?.kind === "user") {
    settings.put({ theme: name }).catch(() => notify("couldn't save your theme"));
  }
}

/** After signing in, the account's theme wins over this browser's. */
export async function loadAccountTheme(): Promise<void> {
  const saved = await settings.get();
  if (saved.theme !== null && saved.theme in themes) {
    setThemeName(saved.theme);
    applyTheme(saved.theme);
    saveThemeName(saved.theme);
  }
}
