import { describe, expect, test } from "vitest";
import { expectClose, loadFixtures } from "../fixtures";
import { REVEAL_MS, answerTimes, scoreMaths, solve } from "./logic";
import type { MathsChallenge, MathsEvent } from "./types";

describe("maths scoring", () => {
  for (const fixture of loadFixtures("maths")) {
    test(`matches the shared fixture ${fixture.file}`, () => {
      const score = scoreMaths(fixture.challenge as MathsChallenge, fixture.events as MathsEvent[]);
      expectClose(score, fixture.expected.score);
      expectClose(score.correct, fixture.expected.primary, "primary");
    });
  }

  test("problems are solved exactly", () => {
    expect(solve({ a: 84, op: "divide", b: 12 })).toBe(7);
    expect(solve({ a: 9, op: "subtract", b: 4 })).toBe(5);
    expect(solve({ a: 6, op: "multiply", b: 7 })).toBe(42);
    expect(solve({ a: 6, op: "add", b: 7 })).toBe(13);
  });

  test("answers go in order; nothing answered is 0% accuracy", () => {
    const challenge: MathsChallenge = { time_s: 30, problems: [{ a: 1, op: "add", b: 1 }] };
    expect(scoreMaths(challenge, [])).toEqual({ correct: 0, wrong: 0, accuracy: 0, per_minute: 0 });
    expect(() => scoreMaths(challenge, [{ t_ms: 0, index: 1, answer: 2 }])).toThrow();
  });
});

describe("maths answer times", () => {
  test("each right answer is timed from when its problem appeared, by operator", () => {
    const challenge: MathsChallenge = {
      time_s: 60,
      problems: [
        { a: 2, op: "add", b: 3 },
        { a: 4, op: "multiply", b: 5 },
        { a: 9, op: "subtract", b: 1 },
      ],
    };
    const events: MathsEvent[] = [
      { t_ms: 1200, index: 0, answer: 5 },
      { t_ms: 2000, index: 1, answer: 21 },
      { t_ms: 2000 + REVEAL_MS + 1500, index: 2, answer: 8 },
    ];
    expect(answerTimes(challenge, events)).toEqual([
      { ms: 1200, label: "2 + 3", category: "+" },
      { ms: 1500, label: "9 − 1", category: "−" },
    ]);
  });
});
