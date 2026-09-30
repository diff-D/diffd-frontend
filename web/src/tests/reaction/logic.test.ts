import { describe, expect, test } from "vitest";
import { expectClose, loadFixtures } from "../fixtures";
import { scoreReaction } from "./logic";
import type { ReactionChallenge, ReactionEvent } from "./types";

describe("reaction scoring", () => {
  for (const fixture of loadFixtures("reaction")) {
    test(`matches the shared fixture ${fixture.file}`, () => {
      const score = scoreReaction(fixture.challenge as ReactionChallenge, fixture.events as ReactionEvent[]);
      expectClose(score, fixture.expected.score);
      expectClose(score.average_ms, fixture.expected.primary, "primary");
    });
  }

  test("every round must be completed and events must make sense", () => {
    const challenge: ReactionChallenge = { rounds: 2, delays_ms: [2000, 2000, 2000] };
    const oneRound: ReactionEvent[] = [
      { t_ms: 0, kind: "round_start" },
      { t_ms: 2000, kind: "go" },
      { t_ms: 2200, kind: "click" },
    ];
    expect(() => scoreReaction(challenge, oneRound)).toThrow();
    expect(() => scoreReaction(challenge, [{ t_ms: 0, kind: "go" }])).toThrow();
  });
});
