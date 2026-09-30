// The server's scoring rules; both must pass fixtures/scoring/unjumble-*.json.
import type { Timed } from "../../ui/stats";
import type { UnjumbleChallenge, UnjumbleEvent, UnjumbleScore } from "./types";

/** The scrambled words of a run: the page's list, or a finished live run's stored entries. */
export const scrambles = (challenge: UnjumbleChallenge): string[] => challenge.entries?.map((entry) => entry.scrambled) ?? challenge.scrambled;

/** The word's letters in sorted order: equal for anagrams. */
const letters = (word: string): string => [...word.toLowerCase()].sort().join("");

/**
 * A guess solves a scramble when it uses the same letters and is a real word. That is the
 * server's rule too: its answer is always a dictionary word.
 */
export function accepts(scrambled: string, guess: string, isWord: (word: string) => boolean): boolean {
  const word = guess.trim().toLowerCase();
  return letters(word) === letters(scrambled) && isWord(word);
}

export function scoreUnjumble(
  challenge: UnjumbleChallenge,
  events: UnjumbleEvent[],
  isWord: (word: string) => boolean,
): UnjumbleScore {
  const limitMs = challenge.time_s * 1000;
  let current = 0;
  let solved = 0;
  let skipped = 0;
  let wrongGuesses = 0;
  for (const event of events) {
    if (event.t_ms > limitMs) break;
    if (event.index !== current) throw new Error("events must be for the word on screen");
    const scrambled = challenge.scrambled[current];
    if (scrambled === undefined) throw new Error("event beyond the generated words");
    if ("skip" in event) {
      skipped += 1;
      current += 1;
    } else if (accepts(scrambled, event.guess, isWord)) {
      solved += 1;
      current += 1;
    } else wrongGuesses += 1;
  }
  return { solved, skipped, wrong_guesses: wrongGuesses };
}

/**
 * How long each solved word took, from the moment it appeared, with its length as the
 * category; `moved` is solved + skipped (the words left behind). A word appears when the
 * one before it is solved or skipped, and the last event of a solved word is the solving
 * guess.
 */
export function solveTimes(challenge: UnjumbleChallenge, events: UnjumbleEvent[], moved: number): Timed[] {
  const last = new Map<number, UnjumbleEvent>();
  for (const event of events) if (event.index < moved) last.set(event.index, event);
  const times: Timed[] = [];
  let shownAt = 0;
  for (let i = 0; i < moved; i++) {
    const event = last.get(i);
    if (!event) break;
    const scrambled = scrambles(challenge)[i];
    if (!("skip" in event)) times.push({ ms: event.t_ms - shownAt, label: scrambled, category: `${[...scrambled].length} letters` });
    shownAt = event.t_ms;
  }
  return times;
}

/** Wrong guesses on each word, by index: every guess but a solved word's last one. */
export function wrongGuessesByWord(events: UnjumbleEvent[], moved: number): number[] {
  const wrong: number[] = [];
  const last = new Map<number, UnjumbleEvent>();
  for (const event of events) {
    last.set(event.index, event);
    if (!("skip" in event)) wrong[event.index] = (wrong[event.index] ?? 0) + 1;
  }
  for (const [i, event] of last) if (i < moved && !("skip" in event)) wrong[i] -= 1;
  return Array.from({ length: wrong.length }, (_, i) => wrong[i] ?? 0);
}
