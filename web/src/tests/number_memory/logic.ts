// The server's scoring rules; both must pass fixtures/scoring/number_memory-*.json.
import type { NumberMemoryChallenge, NumberMemoryEvent, NumberMemoryScore } from "./types";

/** The challenge holds numbers for levels 1-40. */
export const MAX_LEVEL = 40;

/** How long level `level`'s number stays on screen. */
export function showMs(level: number): number {
  return 1000 + 500 * level;
}

export function scoreNumberMemory(challenge: NumberMemoryChallenge, events: NumberMemoryEvent[]): NumberMemoryScore {
  let level = 0;
  // levels run on from the start level; the first wrong answer ends the run
  for (const [i, event] of events.entries()) {
    if (event.level !== challenge.start_level + i) throw new Error("answers must be for consecutive levels from the start");
    const number = challenge.numbers[event.level - 1];
    if (number === undefined) throw new Error("answer beyond the last generated level");
    if (event.answer.trim() !== number) break;
    level = event.level;
  }
  return { level, start_level: challenge.start_level };
}
