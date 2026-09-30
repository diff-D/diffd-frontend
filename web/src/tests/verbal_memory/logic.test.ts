import { describe, expect, test } from "vitest";
import { expectClose, loadFixtures } from "../fixtures";
import { scoreVerbalMemory } from "./logic";
import type { VerbalMemoryChallenge, VerbalMemoryEvent } from "./types";

describe("verbal memory scoring", () => {
  for (const fixture of loadFixtures("verbal_memory")) {
    test(`matches the shared fixture ${fixture.file}`, () => {
      const score = scoreVerbalMemory(fixture.challenge as VerbalMemoryChallenge, fixture.events as VerbalMemoryEvent[]);
      expectClose(score, fixture.expected.score);
      expectClose(score.score, fixture.expected.primary, "primary");
    });
  }

  test("the third mistake ends the run; answers go in order", () => {
    const challenge: VerbalMemoryChallenge = { words: ["a", "b", "a", "c", "d"] };
    const events: VerbalMemoryEvent[] = [
      { t_ms: 0, index: 0, answer: "seen" },
      { t_ms: 1, index: 1, answer: "seen" },
      { t_ms: 2, index: 2, answer: "seen" },
      { t_ms: 3, index: 3, answer: "seen" },
      { t_ms: 4, index: 4, answer: "new" },
    ];
    expect(scoreVerbalMemory(challenge, events)).toEqual({ score: 1, lives_left: 0 });
    expect(() => scoreVerbalMemory(challenge, [{ t_ms: 0, index: 1, answer: "new" }])).toThrow();
  });
});
