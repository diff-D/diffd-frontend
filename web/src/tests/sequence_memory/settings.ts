import type { Mode } from "../../api/types";
import { type Control, type TestSettings, customNumber, hasExactly, isInt, isRecord, note, option } from "../shell/settings";
import type { SequenceMemorySettings } from "./types";

// the server's limits
const MAX_START_LEVEL = 20;
const PRESETS = [1, 5, 10];
const DEFAULTS: SequenceMemorySettings = { start_level: 1 };

function isValid(value: unknown, mode: Mode): value is SequenceMemorySettings {
  return (
    isRecord(value) &&
    hasExactly(value, ["start_level"]) &&
    isInt(value.start_level, 1, MAX_START_LEVEL) &&
    (mode === "practice" || value.start_level === 1)
  );
}

function bar(s: SequenceMemorySettings, mode: Mode): Control<SequenceMemorySettings>[][] {
  if (mode === "ranked") return [[note("start level 1")]];
  return [
    [
      note("start level", (level) => `start level ${level}`),
      ...PRESETS.map((n) => option(s, String(n), s.start_level === n, { start_level: n })),
      customNumber(
        s,
        s.start_level,
        PRESETS,
        { title: "custom start level", label: "level", min: 1, max: MAX_START_LEVEL },
        (n) => ({ start_level: n }),
      ),
    ],
  ];
}

export const sequenceMemorySettings: TestSettings<SequenceMemorySettings> = {
  defaults: { ranked: DEFAULTS, practice: DEFAULTS },
  isValid,
  bar,
};
