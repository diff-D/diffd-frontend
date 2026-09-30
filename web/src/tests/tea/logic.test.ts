import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { expectClose, loadFixtures } from "../fixtures";
import { examples, hasGroup, roundLimit, scoreTea } from "./logic";
import type { TeaChallenge, TeaEvent } from "./types";

const words = new Set(readFileSync(resolve(__dirname, "../../../../wordlists/tea_dictionary.txt"), "utf8").split("\n").filter(Boolean));
const isWord = (word: string) => words.has(word);

describe("tea scoring", () => {
  for (const test_ of ["black_tea", "green_tea", "red_tea", "yellow_tea", "blue_tea"]) {
    for (const fixture of loadFixtures(test_)) {
      test(`matches the shared fixture ${fixture.file}`, () => {
        const score = scoreTea(fixture.challenge as TeaChallenge, fixture.events as TeaEvent[], isWord);
        expectClose(score, fixture.expected.score);
        expectClose(score.points, fixture.expected.primary, "primary");
      });
    }
  }

  test("a word or a skip, and skips only in races", () => {
    const race: TeaChallenge = { groups: ["ate"], rules: { kind: "race", time_s: 60, scattered: false } };
    const survival: TeaChallenge = { groups: ["ate"], rules: { kind: "survival", lives: 3, start_ms: 10000, min_ms: 4000, step_ms: 250 } };
    expect(() => scoreTea(survival, [{ t_ms: 1, skip: true }], isWord)).toThrow();
    expect(() => scoreTea(race, [{ t_ms: 1, skip: true, word: "x" } as unknown as TeaEvent], isWord)).toThrow();
    expect(scoreTea(race, [{ t_ms: 1, skip: true }], isWord).skipped).toBe(1);
  });
});

describe("groups and timers", () => {
  test("scattered groups need their letters in order", () => {
    expect(hasGroup("water", "ate", false)).toBe(true);
    expect(hasGroup("water", "wtr", true)).toBe(true);
    expect(hasGroup("water", "rtw", true)).toBe(false);
    expect(hasGroup("water", "wtr", false)).toBe(false);
  });

  test("black tea's timer shrinks to its floor", () => {
    const rules = { kind: "survival", lives: 3, start_ms: 10000, min_ms: 4000, step_ms: 250 } as const;
    expect(roundLimit(rules, 0)).toBe(10000);
    expect(roundLimit(rules, 4)).toBe(9000);
    expect(roundLimit(rules, 100)).toBe(4000);
  });
});

describe("examples", () => {
  test("the shortest words for a hint, the longest for red tea's best", () => {
    const short = examples(words, "ate", false, "short");
    expect(short).toHaveLength(3);
    expect(short.every((word) => word.includes("ate") && word.length <= 4)).toBe(true);
    const long = examples(words, "ate", false, "long", 1)[0];
    expect(long.length).toBeGreaterThan(12);
    expect(examples(["water"], "wtr", true, "short")).toEqual(["water"]);
  });
});
