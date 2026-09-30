import type { Mode } from "../../api/types";
import { type Control, type TestSettings, isInt, isRecord, note, option } from "../shell/settings";
import type { TeaSettings } from "./types";

type Option = { key: keyof TeaSettings; title: string; values: number[]; unit?: string };

/** Each colour's practice options, with the values the server allows. */
const OPTIONS: Record<string, Option[]> = {
  black_tea: [
    { key: "lives", title: "lives", values: [1, 3, 5] },
    { key: "start_s", title: "first timer", values: [6, 10, 15], unit: "s" },
  ],
  green_tea: [{ key: "time_s", title: "seconds", values: [30, 60, 120] }],
  blue_tea: [{ key: "time_s", title: "seconds", values: [30, 60, 120] }],
  red_tea: [
    { key: "rounds", title: "rounds", values: [3, 5, 8, 10] },
    { key: "round_s", title: "seconds per round", values: [8, 12, 20, 30] },
  ],
  yellow_tea: [
    { key: "rounds", title: "rounds", values: [3, 5, 8, 10] },
    { key: "round_s", title: "seconds per round", values: [8, 12, 20, 30] },
  ],
};

/** The standard (ranked) game of each colour, as practice settings. */
const STANDARD: Record<string, TeaSettings> = {
  black_tea: { lives: 3, start_s: 10 },
  green_tea: { time_s: 60 },
  blue_tea: { time_s: 60 },
  red_tea: { rounds: 8, round_s: 12 },
  yellow_tea: { rounds: 5, round_s: 20 },
};

const RANKED_LABEL: Record<string, string> = {
  black_tea: "3 lives · 10 s",
  green_tea: "60 s",
  blue_tea: "60 s",
  red_tea: "8 rounds · 12 s",
  yellow_tea: "5 rounds · 20 s",
};

/** A tea colour's settings: ranked is the standard game; practice picks each option. */
export function teaSettings(test: string): TestSettings<TeaSettings> {
  const options = OPTIONS[test];
  const isValid = (value: unknown, mode: Mode): value is TeaSettings => {
    if (!isRecord(value)) return false;
    const keys = Object.keys(value);
    if (mode === "ranked") return keys.length === 0;
    return (
      keys.length === options.length &&
      options.every((o) => isInt(value[o.key], 0, 1000) && o.values.includes(value[o.key] as number))
    );
  };
  const bar = (s: TeaSettings, mode: Mode): Control<TeaSettings>[][] => {
    if (mode === "ranked") return [[note(RANKED_LABEL[test])]];
    return options.map((o) => [
      note(o.title),
      ...o.values.map((n) => option(s, o.unit ? `${n} ${o.unit}` : String(n), s[o.key] === n, { [o.key]: n })),
    ]);
  };
  return { defaults: { ranked: {}, practice: STANDARD[test] }, isValid, bar };
}
