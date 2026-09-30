import { describe, expect, test } from "vitest";
import { typingSettings } from "./settings";

const { isValid, bar, defaults } = typingSettings;
const base = defaults.practice;

describe("typing settings", () => {
  test("ranked allows only the standard tests", () => {
    expect(isValid(defaults.ranked, "ranked")).toBe(true);
    expect(isValid({ ...base, mode: "words", words: 25 }, "ranked")).toBe(true);
    for (const changes of [{ time_s: 45 }, { words: 100 }, { word_list: "english_1k" }, { punctuation: true }, { numbers: true }]) {
      expect(isValid({ ...base, ...changes }, "ranked"), JSON.stringify(changes)).toBe(false);
      expect(isValid({ ...base, ...changes }, "practice"), JSON.stringify(changes)).toBe(true);
    }
  });

  test("remembered values of the wrong shape or outside the limits are rejected", () => {
    const bad = [
      null,
      "time",
      [],
      { mode: "time", time_s: 30, words: 50 },
      { ...base, extra: 1 },
      { ...base, time_s: 0 },
      { ...base, time_s: 301 },
      { ...base, words: 501 },
      { ...base, time_s: 2.5 },
      { ...base, word_list: "klingon" },
      { ...base, mode: "zen" },
    ];
    for (const value of bad) expect(isValid(value, "practice"), JSON.stringify(value)).toBe(false);
  });

  test("ranked shows only time/words and their standard lengths", () => {
    expect(bar(defaults.ranked, "ranked").map((group) => group.map((c) => c.label))).toEqual([
      ["time", "words"],
      ["15", "30", "60"],
    ]);
    expect(bar({ ...base, mode: "words" }, "ranked")[1].map((c) => c.label)).toEqual(["25", "50"]);
  });

  test("practice adds a custom length, word lists and toggles", () => {
    const groups = bar({ ...base, time_s: 45 }, "practice");
    expect(groups.map((group) => group.map((c) => c.label))).toEqual([
      ["time", "words"],
      ["15", "30", "60", "45"],
      ["english", "english 1k"],
      ["punctuation", "numbers"],
    ]);
    const custom = groups[1][3];
    if (custom.kind !== "custom") throw new Error("no custom control");
    expect(custom.active).toBe(true);
    expect(custom.prompt.inputs).toEqual([{ label: "seconds", min: 1, max: 300, value: 45 }]);
    expect(custom.prompt.apply([120])).toEqual({ ...base, time_s: 120 });
    expect(groups[3][0]).toEqual({ kind: "option", label: "punctuation", active: false, next: { ...base, time_s: 45, punctuation: true } });
  });
});
