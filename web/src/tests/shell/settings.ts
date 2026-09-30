import type { Mode } from "../../api/types";

/** A small form for typing custom numbers into the settings bar (e.g. a 45 s typing test). */
export type CustomPrompt<S> = {
  title: string;
  inputs: { label: string; min: number; max: number; value: number }[];
  /** The settings for the entered values (already clamped to each input's limits). */
  apply: (values: number[]) => S;
};

/** `summary`: how a group titled by this note reads in the settings summary, given its choice. */
type Note = { kind: "note"; label: string; summary?: (choice: string) => string };

/** One item of the settings bar. */
export type Control<S> =
  | { kind: "option"; label: string; active: boolean; next: S }
  | { kind: "custom"; label: string; active: boolean; prompt: CustomPrompt<S> }
  | Note;

/** Everything a test tells the shell about its settings. */
export type TestSettings<S> = {
  defaults: Record<Mode, S>;
  /** Whether a remembered value is still allowed in that mode (shape, limits, options). */
  isValid: (value: unknown, mode: Mode) => value is S;
  /** The bar after `ranked | practice`: groups of controls, shown with dividers. */
  bar: (settings: S, mode: Mode) => Control<S>[][];
};

/** What a test page remembers: the mode last played and the settings of each mode. */
export type Remembered<S> = { mode: Mode; ranked: S; practice: S };

/** Settings of a test without options: ranked and practice play the same game. */
export type NoSettings = Record<string, never>;

export const NO_SETTINGS: TestSettings<NoSettings> = {
  defaults: { ranked: {}, practice: {} },
  isValid: (value): value is NoSettings => isRecord(value) && hasExactly(value, []),
  bar: () => [],
};

const storageKey = (test: string) => `diffd-settings-${test}`;

export function loadSettings<S>(test: string, settings: TestSettings<S>): Remembered<S> {
  let saved: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(storageKey(test)) ?? "null");
    if (isRecord(parsed)) saved = parsed;
  } catch {
    // unreadable or unavailable storage: the defaults
  }
  const pick = (mode: Mode): S => {
    const value = saved[mode];
    return settings.isValid(value, mode) ? value : settings.defaults[mode];
  };
  return { mode: saved.mode === "practice" ? "practice" : "ranked", ranked: pick("ranked"), practice: pick("practice") };
}

export function saveSettings<S>(test: string, remembered: Remembered<S>): void {
  try {
    localStorage.setItem(storageKey(test), JSON.stringify(remembered));
  } catch {
    // the settings just aren't remembered
  }
}

export function option<S extends object>(s: S, label: string, active: boolean, changes: Partial<S>): Control<S> {
  return { kind: "option", label, active, next: { ...s, ...changes } };
}

/** A muted label in the bar (ranked's fixed settings, or a group's name and how its choice reads). */
export function note(label: string, summary?: (choice: string) => string): Note {
  return summary ? { kind: "note", label, summary } : { kind: "note", label };
}

/** "1 life", "3 lives": a count with its noun. */
export const counted = (one: string, many: string) => (n: string) => `${n} ${n === "1" ? one : many}`;

/** A "custom" button for one number; it shows the number when that is not a preset. */
export function customNumber<S extends object>(
  s: S,
  current: number,
  presets: number[],
  input: { title: string; label: string; min: number; max: number },
  changes: (n: number) => Partial<S>,
): Control<S> {
  const custom = !presets.includes(current);
  return {
    kind: "custom",
    label: custom ? String(current) : "custom",
    active: custom,
    prompt: {
      title: input.title,
      inputs: [{ label: input.label, min: input.min, max: input.max, value: current }],
      apply: ([n]) => ({ ...s, ...changes(n) }),
    },
  };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isInt(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

/** The object has these keys and no others (the server rejects unknown settings). */
export function hasExactly(value: Record<string, unknown>, keys: string[]): boolean {
  const actual = Object.keys(value);
  return actual.length === keys.length && keys.every((key) => key in value);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}
