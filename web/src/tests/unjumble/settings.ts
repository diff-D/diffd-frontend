import type { Mode } from "../../api/types";
import { type Control, type TestSettings, hasExactly, isInt, isRecord, note, option } from "../shell/settings";
import type { UnjumbleSettings, WordList } from "./types";

// the server's limits
const TIMES = [30, 60, 120];
const MIN_LEN = 3;
const MAX_LEN = 10;
const LENGTHS: [number, number][] = [
  [3, 5],
  [3, 8],
  [4, 7],
  [5, 8],
  [6, 10],
];
const WORD_LISTS: WordList[] = ["english", "english_1k"];
/** The longest words each list has for unjumble (english has none over 8 letters). */
const LONGEST: Record<WordList, number> = { english: 8, english_1k: MAX_LEN };
const KEYS = ["time_s", "min_len", "max_len", "word_list"];
/** Words get longer as you go: three of each length from `min_len` up to `max_len`. */
const DEFAULTS: UnjumbleSettings = { time_s: 60, min_len: 3, max_len: 8, word_list: "english_1k" };

function isValid(value: unknown, mode: Mode): value is UnjumbleSettings {
  if (!isRecord(value) || !hasExactly(value, KEYS)) return false;
  const { time_s, min_len, max_len, word_list } = value;
  const shaped =
    TIMES.includes(time_s as number) &&
    isInt(min_len, MIN_LEN, MAX_LEN) &&
    isInt(max_len, MIN_LEN, MAX_LEN) &&
    (min_len as number) <= (max_len as number) &&
    WORD_LISTS.includes(word_list as WordList) &&
    (max_len as number) <= LONGEST[word_list as WordList];
  if (!shaped || mode === "practice") return shaped;
  return (
    time_s === DEFAULTS.time_s &&
    min_len === DEFAULTS.min_len &&
    max_len === DEFAULTS.max_len &&
    word_list === DEFAULTS.word_list
  );
}

const range = (min: number, max: number) => `${min}–${max}`;

function bar(s: UnjumbleSettings, mode: Mode): Control<UnjumbleSettings>[][] {
  if (mode === "ranked") return [[note("60 s · 3–8 letters · english 1k")]];
  const longest = LONGEST[s.word_list];
  const lengths = LENGTHS.filter(([, max]) => max <= longest);
  const preset = lengths.some(([min, max]) => min === s.min_len && max === s.max_len);
  const custom: Control<UnjumbleSettings> = {
    kind: "custom",
    label: preset ? "custom" : range(s.min_len, s.max_len),
    active: !preset,
    prompt: {
      title: "custom word length",
      inputs: [
        { label: "shortest", min: MIN_LEN, max: longest, value: s.min_len },
        { label: "longest", min: MIN_LEN, max: longest, value: s.max_len },
      ],
      apply: ([a, b]) => ({ ...s, min_len: Math.min(a, b), max_len: Math.max(a, b) }),
    },
  };
  return [
    [note("seconds", (t) => `${t} s`), ...TIMES.map((t) => option(s, String(t), s.time_s === t, { time_s: t }))],
    [
      note("letters", (range) => `${range} letters`),
      ...lengths.map(([min, max]) => option(s, range(min, max), s.min_len === min && s.max_len === max, { min_len: min, max_len: max })),
      custom,
    ],
    // a shorter list pulls the lengths down to what it has
    [note("words"), ...WORD_LISTS.map((list) =>
      option(s, list.replace("_", " "), s.word_list === list, {
        word_list: list,
        min_len: Math.min(s.min_len, LONGEST[list]),
        max_len: Math.min(s.max_len, LONGEST[list]),
      }),
    )],
  ];
}

export const unjumbleSettings: TestSettings<UnjumbleSettings> = { defaults: { ranked: DEFAULTS, practice: DEFAULTS }, isValid, bar };
