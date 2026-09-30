import { describe, expect, test } from "vitest";
import { expectClose, loadFixtures } from "../fixtures";
import { TILE_KEYS, scoreSequenceMemory } from "./logic";
import type { SequenceMemoryChallenge, SequenceMemoryEvent } from "./types";

describe("sequence memory scoring", () => {
  for (const fixture of loadFixtures("sequence_memory")) {
    test(`matches the shared fixture ${fixture.file}`, () => {
      const score = scoreSequenceMemory(fixture.challenge as SequenceMemoryChallenge, fixture.events as SequenceMemoryEvent[]);
      expectClose(score, fixture.expected.score);
      expectClose(score.level, fixture.expected.primary, "primary");
    });
  }

  test("a wrong tile ends the run; taps must be for the level being played", () => {
    const challenge: SequenceMemoryChallenge = { sequence: [1, 2, 3] };
    const events = [
      { t_ms: 0, level: 1, tile: 1 },
      { t_ms: 1, level: 2, tile: 5 },
    ];
    expect(scoreSequenceMemory(challenge, events)).toEqual({ level: 1 });
    expect(() => scoreSequenceMemory(challenge, [{ t_ms: 0, level: 2, tile: 1 }])).toThrow();
    expect(() => scoreSequenceMemory(challenge, [{ t_ms: 0, level: 1, tile: 9 }])).toThrow();
  });

  test("keys are laid out like a numpad: 7 8 9 on top", () => {
    expect(TILE_KEYS).toEqual(["7", "8", "9", "4", "5", "6", "1", "2", "3"]);
  });
});
