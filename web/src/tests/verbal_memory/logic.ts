// The server's scoring rules; both must pass fixtures/scoring/verbal_memory-*.json.
import type { VerbalMemoryChallenge, VerbalMemoryEvent, VerbalMemoryScore } from "./types";

const LIVES = 3;

/** The lives a run starts with. */
export const livesOf = (challenge: VerbalMemoryChallenge) => challenge.lives ?? LIVES;

export function scoreVerbalMemory(challenge: VerbalMemoryChallenge, events: VerbalMemoryEvent[]): VerbalMemoryScore {
  const start = livesOf(challenge);
  if (!Number.isInteger(start) || start < 1 || start > 5) throw new Error("lives must be 1-5");
  let lives = start;
  let score = 0;
  for (const [expected, event] of events.entries()) {
    if (event.index !== expected) throw new Error("answers must be in order, one per word");
    const word = challenge.words[event.index];
    if (word === undefined) throw new Error("answer beyond the generated words");
    const seenBefore = challenge.words.slice(0, event.index).includes(word);
    if ((event.answer === "seen") === seenBefore) score += 1;
    else {
      lives -= 1;
      if (lives === 0) break;
    }
  }
  return { score, lives_left: lives };
}
