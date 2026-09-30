// The server's scoring rules; both must pass fixtures/scoring/*_tea-*.json.
import type { TeaChallenge, TeaEvent, TeaRules, TeaScore } from "./types";

/** A guess the way it is checked: trimmed, lowercase. */
export const normalize = (guess: string): string => guess.trim().toLowerCase();

/** The word has the group: together, or (`scattered`) its letters in order with gaps. */
export function hasGroup(word: string, group: string, scattered: boolean): boolean {
  if (!scattered) return word.includes(group);
  let at = 0;
  for (const letter of group) {
    at = word.indexOf(letter, at);
    if (at < 0) return false;
    at += 1;
  }
  return true;
}

/**
 * Words that would have answered a group: the `n` shortest (the easiest to think of), or
 * the `n` longest (red tea's best possible).
 */
export function examples(words: Iterable<string>, group: string, scattered: boolean, pick: "short" | "long", n = 3): string[] {
  const fits: string[] = [];
  for (const word of words) if (hasGroup(word, group, scattered)) fits.push(word);
  fits.sort((a, b) => (pick === "short" ? a.length - b.length : b.length - a.length) || a.localeCompare(b));
  return fits.slice(0, n);
}

/** Black tea: the time to answer round `round` (it shrinks as the run goes on). */
export function roundLimit(rules: Extract<TeaRules, { kind: "survival" }>, round: number): number {
  return Math.max(rules.start_ms - round * rules.step_ms, rules.min_ms);
}

/** The group guesses are checked against in a race or survival run, and which guesses count. */
export class TeaJudge {
  readonly used = new Set<string>();
  constructor(
    readonly isWord: (word: string) => boolean,
    readonly scattered: boolean,
  ) {}

  /** The accepted word, or null: a real word with the group, not used before. */
  accept(guess: string, group: string): string | null {
    const word = normalize(guess);
    if (!hasGroup(word, group, this.scattered) || this.used.has(word) || !this.isWord(word)) return null;
    this.used.add(word);
    return word;
  }
}

/** An accepted word, its round (the index of its group), and how long it took from when the
 * group appeared (or its round began). */
export type TeaAnswer = { word: string; ms: number; round: number };

/** `answers`, if given, collects each accepted word with its time (see `TeaAnswer`). */
export function scoreTea(challenge: TeaChallenge, events: TeaEvent[], isWord: (word: string) => boolean, answers?: TeaAnswer[]): TeaScore {
  const { groups, rules } = challenge;
  const score: TeaScore = { points: 0, words: [], wrong: 0, skipped: 0, missed: 0 };
  const judge = new TeaJudge(isWord, rules.kind === "race" && rules.scattered);
  for (const event of events) if ("skip" in event === "word" in event) throw new Error("each event is either a word or a skip");

  if (rules.kind === "survival") {
    let round = 0;
    let started = 0;
    let lives = rules.lives;
    for (const event of events) {
      if ("skip" in event) throw new Error("black tea has no skipping");
      while (event.t_ms > started + roundLimit(rules, round)) {
        started += roundLimit(rules, round);
        round += 1;
        score.missed += 1;
        lives -= 1;
        if (lives === 0 || round === groups.length) return score;
      }
      const word = judge.accept(event.word, groups[round]);
      if (word === null) {
        score.wrong += 1;
        continue;
      }
      score.words.push(word);
      answers?.push({ word, ms: event.t_ms - started, round });
      score.points += 1;
      started = event.t_ms;
      round += 1;
      if (round === groups.length) return score;
    }
    return score;
  }

  if (rules.kind === "race") {
    let round = 0;
    let shownAt = 0;
    for (const event of events) {
      if (event.t_ms > rules.time_s * 1000 || round === groups.length) break;
      if ("skip" in event) {
        score.skipped += 1;
        round += 1;
        shownAt = event.t_ms;
        continue;
      }
      const word = judge.accept(event.word, groups[round]);
      if (word === null) score.wrong += 1;
      else {
        score.words.push(word);
        answers?.push({ word, ms: event.t_ms - shownAt, round });
        score.points += 1;
        round += 1;
        shownAt = event.t_ms;
      }
    }
    return score;
  }

  const longest = new Array<number>(rules.rounds).fill(0);
  for (const event of events) {
    if ("skip" in event) throw new Error("these rounds have no skipping");
    const round = Math.floor(event.t_ms / rules.round_ms);
    if (round >= rules.rounds || round >= groups.length) break;
    const word = judge.accept(event.word, groups[round]);
    if (word === null) {
      score.wrong += 1;
      continue;
    }
    longest[round] = Math.max(longest[round], [...word].length);
    score.words.push(word);
    answers?.push({ word, ms: event.t_ms - round * rules.round_ms, round });
    if (rules.count === "most") score.points += 1;
  }
  if (rules.count === "longest") score.points = longest.reduce((a, b) => a + b, 0);
  return score;
}
