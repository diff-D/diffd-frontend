import type { Mode } from "../../api/types";
import { type Control, type TestSettings, customNumber, hasExactly, isInt, isRecord, option } from "../shell/settings";
import type { TypingSettings, WordList } from "./types";

// the server's limits
const RANKED_TIMES = [15, 30, 60];
const RANKED_WORDS = [25, 50];
const PRACTICE_TIMES = [15, 30, 60];
const PRACTICE_WORDS = [25, 50, 100];
const MAX_TIME_S = 300;
const MAX_WORDS = 500;
const WORD_LISTS: WordList[] = ["english", "english_1k"];
const KEYS = ["mode", "time_s", "words", "word_list", "punctuation", "numbers"];

const DEFAULTS: TypingSettings = { mode: "time", time_s: 30, words: 50, word_list: "english", punctuation: false, numbers: false };

function isValid(value: unknown, mode: Mode): value is TypingSettings {
  if (!isRecord(value) || !hasExactly(value, KEYS)) return false;
  const { mode: testMode, time_s, words, word_list, punctuation, numbers } = value;
  const shaped =
    (testMode === "time" || testMode === "words") &&
    isInt(time_s, 1, MAX_TIME_S) &&
    isInt(words, 1, MAX_WORDS) &&
    WORD_LISTS.includes(word_list as WordList) &&
    typeof punctuation === "boolean" &&
    typeof numbers === "boolean";
  if (!shaped || mode === "practice") return shaped;
  return (
    RANKED_TIMES.includes(time_s as number) &&
    RANKED_WORDS.includes(words as number) &&
    word_list === "english" &&
    !punctuation &&
    !numbers
  );
}

function bar(s: TypingSettings, mode: Mode): Control<TypingSettings>[][] {
  const set = (label: string, active: boolean, changes: Partial<TypingSettings>) => option(s, label, active, changes);
  const modes = [set("time", s.mode === "time", { mode: "time" }), set("words", s.mode === "words", { mode: "words" })];
  const time = s.mode === "time";
  if (mode === "ranked") {
    const lengths = time
      ? RANKED_TIMES.map((n) => set(String(n), s.time_s === n, { time_s: n }))
      : RANKED_WORDS.map((n) => set(String(n), s.words === n, { words: n }));
    return [modes, lengths];
  }
  const presets = time ? PRACTICE_TIMES : PRACTICE_WORDS;
  const current = time ? s.time_s : s.words;
  const lengths = [
    ...presets.map((n) => set(String(n), current === n, time ? { time_s: n } : { words: n })),
    customNumber(
      s,
      current,
      presets,
      time
        ? { title: "custom duration", label: "seconds", min: 1, max: MAX_TIME_S }
        : { title: "custom word count", label: "words", min: 1, max: MAX_WORDS },
      (n): Partial<TypingSettings> => (time ? { time_s: n } : { words: n }),
    ),
  ];
  const lists = WORD_LISTS.map((list) => set(list.replace("_", " "), s.word_list === list, { word_list: list }));
  const extras = [
    set("punctuation", s.punctuation, { punctuation: !s.punctuation }),
    set("numbers", s.numbers, { numbers: !s.numbers }),
  ];
  return [modes, lengths, lists, extras];
}

export const typingSettings: TestSettings<TypingSettings> = { defaults: { ranked: DEFAULTS, practice: DEFAULTS }, isValid, bar };
