import { describe, expect, test } from "vitest";
import { expectClose, loadFixtures } from "../fixtures";
import { gridSize, scorePatternMemory, showMs, tileCount } from "./logic";
import type { PatternMemoryChallenge, PatternMemoryEvent } from "./types";

describe("pattern memory scoring", () => {
  for (const fixture of loadFixtures("pattern_memory")) {
    test(`matches the shared fixture ${fixture.file}`, () => {
      const score = scorePatternMemory(fixture.challenge as PatternMemoryChallenge, fixture.events as PatternMemoryEvent[]);
      expectClose(score, fixture.expected.score);
      expectClose(score.level, fixture.expected.primary, "primary");
    });
  }

  test("taps must be for the pattern on screen, on the grid, and once each", () => {
    const challenge: PatternMemoryChallenge = { levels: [[[0, 4, 8], [1, 2, 3], [5, 6, 7]]] };
    const bad: PatternMemoryEvent[][] = [
      [{ t_ms: 0, level: 2, attempt: 0, tile: 0 }],
      [{ t_ms: 0, level: 1, attempt: 1, tile: 1 }],
      [{ t_ms: 0, level: 1, attempt: 0, tile: 9 }],
      [
        { t_ms: 0, level: 1, attempt: 0, tile: 4 },
        { t_ms: 1, level: 1, attempt: 0, tile: 4 },
      ],
    ];
    for (const events of bad) expect(() => scorePatternMemory(challenge, events), JSON.stringify(events)).toThrow();
    expect(scorePatternMemory(challenge, [])).toEqual({ level: 0, lives_left: 3 });
  });

  test("the grid grows from 3x3 to 8x8 and longer patterns stay up longer", () => {
    expect([gridSize(1), gridSize(3), gridSize(4), gridSize(16), gridSize(30)]).toEqual([3, 3, 4, 8, 8]);
    expect([tileCount(1), tileCount(4)]).toEqual([3, 6]);
    expect(showMs(1)).toBe(1150);
    expect(showMs(30) > showMs(1)).toBe(true);
  });
});
