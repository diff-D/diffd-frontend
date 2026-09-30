import type { Mode } from "../../api/types";
import { type Control, type TestSettings, counted, customNumber, hasExactly, isInt, isRecord, note, option } from "../shell/settings";
import type { ReactionSettings } from "./types";

// the server's limits
const RANKED_ROUNDS = 5;
const MAX_ROUNDS = 20;
const PRESETS = [1, 3, 5, 10];

function isValid(value: unknown, mode: Mode): value is ReactionSettings {
  return (
    isRecord(value) &&
    hasExactly(value, ["rounds"]) &&
    isInt(value.rounds, 1, MAX_ROUNDS) &&
    (mode === "practice" || value.rounds === RANKED_ROUNDS)
  );
}

function bar(s: ReactionSettings, mode: Mode): Control<ReactionSettings>[][] {
  if (mode === "ranked") return [[note(`${RANKED_ROUNDS} rounds`)]];
  return [
    [
      note("rounds", counted("round", "rounds")),
      ...PRESETS.map((n) => option(s, String(n), s.rounds === n, { rounds: n })),
      customNumber(s, s.rounds, PRESETS, { title: "custom rounds", label: "rounds", min: 1, max: MAX_ROUNDS }, (n) => ({ rounds: n })),
    ],
  ];
}

const DEFAULTS: ReactionSettings = { rounds: RANKED_ROUNDS };

export const reactionSettings: TestSettings<ReactionSettings> = { defaults: { ranked: DEFAULTS, practice: DEFAULTS }, isValid, bar };
