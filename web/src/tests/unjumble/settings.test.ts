import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { unjumbleSettings } from "./settings";

const { isValid, bar, defaults } = unjumbleSettings;
const base = defaults.practice;

describe("unjumble settings", () => {
  test("ranked is 60 s of 3-8 letter english_1k words", () => {
    expect(isValid(defaults.ranked, "ranked")).toBe(true);
    expect(isValid({ ...base, time_s: 30 }, "ranked")).toBe(false);
    expect(isValid({ ...base, word_list: "english" }, "ranked")).toBe(false);
    expect(isValid({ ...base, time_s: 30, min_len: 3, max_len: 10 }, "practice")).toBe(true);
  });

  test("lengths are 3-10 with the shortest first", () => {
    const bad = [
      { ...base, min_len: 2 },
      { ...base, max_len: 11 },
      { ...base, min_len: 8, max_len: 5 },
      { ...base, word_list: "french" },
      { ...base, time_s: 45 },
      { ...base, extra: 1 },
    ];
    for (const value of bad) expect(isValid(value, "practice"), JSON.stringify(value)).toBe(false);
  });

  test("a custom length range is shown and put in order", () => {
    expect(bar(base, "ranked")).toEqual([[{ kind: "note", label: "60 s · 3–8 letters · english 1k" }]]);
    const lengths = bar({ ...base, min_len: 3, max_len: 9 }, "practice")[1];
    expect(lengths.map((c) => c.label)).toEqual(["letters", "3–5", "3–8", "4–7", "5–8", "6–10", "3–9"]);
    const custom = lengths[6];
    if (custom.kind !== "custom") throw new Error("no custom control");
    expect(custom.active).toBe(true);
    expect(custom.prompt.apply([9, 4])).toEqual({ ...base, min_len: 4, max_len: 9 });
  });

  test("english has no words over 8 letters, so its lengths stop there", () => {
    expect(isValid({ ...base, word_list: "english", min_len: 9, max_len: 10 }, "practice")).toBe(false);
    expect(isValid({ ...base, word_list: "english", min_len: 3, max_len: 8 }, "practice")).toBe(true);
    const lengths = bar({ ...base, word_list: "english" }, "practice")[1];
    expect(lengths.map((c) => c.label)).toEqual(["letters", "3–5", "3–8", "4–7", "5–8", "custom"]);
    const custom = lengths[5];
    if (custom.kind !== "custom") throw new Error("no custom control");
    expect(custom.prompt.inputs.map((input) => input.max)).toEqual([8, 8]);
    const toEnglish = bar({ ...base, min_len: 6, max_len: 10 }, "practice")[2][1];
    expect(toEnglish).toMatchObject({ label: "english", next: { word_list: "english", min_len: 6, max_len: 8 } });
  });

  test("every length range the settings allow has words in its list", () => {
    // the server's pool: lowercase a-z, not all one letter, no anagram in the same list
    const letters = (word: string) => [...word].sort().join("");
    for (const list of ["english", "english_1k"] as const) {
      const file = resolve(__dirname, `../../../../wordlists/${list}.json`);
      const words = (JSON.parse(readFileSync(file, "utf8")) as { words: string[] }).words;
      const spellings = new Map<string, number>();
      for (const word of words) spellings.set(letters(word), (spellings.get(letters(word)) ?? 0) + 1);
      const pool = words.filter((w) => /^[a-z]+$/.test(w) && [...w].some((c) => c !== w[0]) && spellings.get(letters(w)) === 1);
      for (let min = 3; min <= 10; min++) {
        for (let max = min; max <= 10; max++) {
          const settings = { ...base, word_list: list, min_len: min, max_len: max };
          if (!isValid(settings, "practice")) continue;
          expect(pool.some((w) => w.length >= min && w.length <= max), JSON.stringify(settings)).toBe(true);
        }
      }
    }
  });
});
