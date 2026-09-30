// The server's scoring rules; both must pass fixtures/scoring/sequence_memory-*.json.
import type { SequenceMemoryChallenge, SequenceMemoryEvent, SequenceMemoryScore } from "./types";

/** The key for each tile, laid out like a numpad (tiles 0-8 go row by row from the top). */
export const TILE_KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3"];

/** The level a run starts at. */
export const startLevel = (challenge: SequenceMemoryChallenge) => challenge.start_level ?? 1;

export function scoreSequenceMemory(challenge: SequenceMemoryChallenge, events: SequenceMemoryEvent[]): SequenceMemoryScore {
  const start = startLevel(challenge);
  if (!Number.isInteger(start) || start < 1 || start > 20) throw new Error("the start level must be 1-20");
  let level = start;
  let position = 0;
  let completed = 0;
  for (const event of events) {
    if (event.level !== level) throw new Error("taps must be for the current level");
    if (!Number.isInteger(event.tile) || event.tile < 0 || event.tile > 8) throw new Error("tiles are numbered 0-8");
    if (level > challenge.sequence.length) throw new Error("level beyond the generated sequence");
    if (event.tile !== challenge.sequence[position]) break;
    position += 1;
    if (position === level) {
      completed = level;
      level += 1;
      position = 0;
    }
  }
  return { level: completed };
}
