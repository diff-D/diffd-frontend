// The server's scoring rules; both must pass fixtures/scoring/pattern_memory-*.json.
import type { PatternMemoryChallenge, PatternMemoryEvent, PatternMemoryScore } from "./types";

export const LIVES = 3;
export const LEVELS = 30;

/** The grid's side at `level`: 3x3 for levels 1-3, one wider every 3 levels, 8x8 from 16. */
export const gridSize = (level: number): number => Math.min(8, 3 + Math.floor((level - 1) / 3));

/** How many tiles light up at `level`. */
export const tileCount = (level: number): number => level + 2;

/** How long the pattern stays lit: a little longer for longer patterns. */
export const showMs = (level: number): number => 1000 + 50 * tileCount(level);

/** The level a run starts at. */
export const startLevel = (challenge: PatternMemoryChallenge) => challenge.start_level ?? 1;

export function scorePatternMemory(challenge: PatternMemoryChallenge, events: PatternMemoryEvent[]): PatternMemoryScore {
  const start = startLevel(challenge);
  if (!Number.isInteger(start) || start < 1 || start > 20) throw new Error("the start level must be 1-20");
  let level = start;
  let attempt = 0;
  let lives = LIVES;
  let completed = 0;
  let picked = new Set<number>();
  for (const event of events) {
    if (event.level !== level || event.attempt !== attempt) throw new Error("taps must be for the pattern on screen");
    const pattern = challenge.levels[level - 1]?.[attempt];
    if (pattern === undefined) throw new Error("tap beyond the generated patterns");
    if (!Number.isInteger(event.tile) || event.tile < 0 || event.tile >= gridSize(level) ** 2) throw new Error("tile off the grid");
    if (picked.has(event.tile)) throw new Error("each tile can be picked once");
    if (pattern.includes(event.tile)) {
      picked.add(event.tile);
      if (picked.size === pattern.length) {
        completed = level;
        level += 1;
        attempt = 0;
        picked = new Set();
      }
    } else {
      lives -= 1;
      if (lives === 0) break;
      attempt += 1;
      picked = new Set();
    }
  }
  return { level: completed, lives_left: lives };
}
