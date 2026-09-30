import type { Mode } from "../../api/types";
import { type Control, type TestSettings, counted, hasExactly, isInt, isRecord, note, option } from "../shell/settings";
import type { VerbalMemorySettings } from "./types";

// the server's limits
const RANKED_LIVES = 3;
const MAX_LIVES = 5;
const DEFAULTS: VerbalMemorySettings = { lives: RANKED_LIVES };

function isValid(value: unknown, mode: Mode): value is VerbalMemorySettings {
  return (
    isRecord(value) &&
    hasExactly(value, ["lives"]) &&
    isInt(value.lives, 1, MAX_LIVES) &&
    (mode === "practice" || value.lives === RANKED_LIVES)
  );
}

function bar(s: VerbalMemorySettings, mode: Mode): Control<VerbalMemorySettings>[][] {
  if (mode === "ranked") return [[note(`${RANKED_LIVES} lives`)]];
  const choices = Array.from({ length: MAX_LIVES }, (_, i) => i + 1);
  return [[note("lives", counted("life", "lives")), ...choices.map((n) => option(s, String(n), s.lives === n, { lives: n }))]];
}

export const verbalMemorySettings: TestSettings<VerbalMemorySettings> = {
  defaults: { ranked: DEFAULTS, practice: DEFAULTS },
  isValid,
  bar,
};
