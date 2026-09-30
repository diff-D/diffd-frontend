import { describe, expect, test } from "vitest";
import { expectClose, loadFixtures } from "../fixtures";
import { scoreNumberMemory, showMs } from "./logic";
import type { NumberMemoryChallenge, NumberMemoryEvent } from "./types";

describe("number memory scoring", () => {
  for (const fixture of loadFixtures("number_memory")) {
    test(`matches the shared fixture ${fixture.file}`, () => {
      const score = scoreNumberMemory(fixture.challenge as NumberMemoryChallenge, fixture.events as NumberMemoryEvent[]);
      expectClose(score, fixture.expected.score);
      expectClose(score.level, fixture.expected.primary, "primary");
    });
  }

  test("levels run on from the start level and the first wrong answer ends it", () => {
    const challenge: NumberMemoryChallenge = { start_level: 2, numbers: ["1", "23", "456"] };
    expect(() => scoreNumberMemory(challenge, [{ t_ms: 0, level: 3, answer: "456" }])).toThrow();
    const events = [
      { t_ms: 0, level: 2, answer: "23" },
      { t_ms: 1, level: 3, answer: "4" },
    ];
    expect(scoreNumberMemory(challenge, events)).toEqual({ level: 2, start_level: 2 });
    expect(scoreNumberMemory(challenge, [])).toEqual({ level: 0, start_level: 2 });
  });

  test("the number stays up longer at higher levels", () => {
    expect(showMs(1)).toBe(1500);
    expect(showMs(10)).toBe(6000);
  });
});
