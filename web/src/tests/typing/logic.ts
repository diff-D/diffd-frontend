// The server's scoring rules; both must pass fixtures/scoring/typing-*.json.
import type { TypingChallenge, TypingEvent, TypingScore } from "./types";

export type Key = { kind: "char"; char: string } | { kind: "space" } | { kind: "backspace" };

/** The server counts characters as code points, not UTF-16 units. */
const chars = (s: string): string[] => [...s];

const round2 = (x: number): number => Math.round(x * 100) / 100;

/** Parses a key name as stored in events ("Space", "Backspace" or one printable character). */
export function parseKey(name: string): Key | null {
  if (name === "Space") return { kind: "space" };
  if (name === "Backspace") return { kind: "backspace" };
  if (chars(name).length === 1 && !/[\p{C}\s]/u.test(name)) return { kind: "char", char: name };
  return null;
}

/** The typing key for a keyboard event; shortcuts and non-character keys are ignored. */
export function keyFromEvent(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean }): Key | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  return e.key === " " ? { kind: "space" } : parseKey(e.key);
}

export function keyName(key: Key): string {
  if (key.kind === "char") return key.char;
  return key.kind === "space" ? "Space" : "Backspace";
}

/** The typed state of a test, advanced one keystroke at a time. */
export class TypingModel {
  /** What was typed for each committed word, and whether a space committed it. */
  readonly committed: { typed: string; spaced: boolean }[] = [];
  current = "";
  correctKeys = 0;
  totalKeys = 0;
  /** Times of counted keystrokes (characters and spaces), and of the wrong ones. */
  readonly keyTimes: number[] = [];
  readonly errorTimes: number[] = [];
  finishedAt: number | null = null;

  constructor(readonly challenge: TypingChallenge) {}

  get done(): boolean {
    return this.committed.length === this.challenge.words.length;
  }

  press(key: Key, tMs: number): void {
    if (this.done) return;
    const index = this.committed.length;
    const target = this.challenge.words[index];
    switch (key.kind) {
      case "backspace": {
        // at the start of a word, backspace goes back into the previous word, but only
        // when that word is wrong (as in Monkeytype)
        const previous = this.committed.at(-1);
        if (this.current === "") {
          if (previous && previous.typed !== this.challenge.words[index - 1]) this.current = this.committed.pop()!.typed;
        } else {
          this.current = chars(this.current).slice(0, -1).join("");
        }
        break;
      }
      case "space":
        // a space before typing anything is ignored, as in Monkeytype
        if (this.current === "") break;
        this.count(tMs, this.current === target);
        this.committed.push({ typed: this.current, spaced: true });
        this.current = "";
        break;
      case "char": {
        const position = chars(this.current).length;
        this.count(tMs, chars(target)[position] === key.char);
        this.current += key.char;
        // in words mode the last word ends the test as soon as it is right
        const isLast = index === this.challenge.words.length - 1;
        if (this.challenge.mode === "words" && isLast && this.current === target) {
          this.committed.push({ typed: this.current, spaced: false });
          this.current = "";
        }
        break;
      }
    }
    if (this.done) this.finishedAt = tMs;
  }

  private count(tMs: number, correct: boolean): void {
    this.totalKeys += 1;
    if (correct) this.correctKeys += 1;
    else this.errorTimes.push(tMs);
    this.keyTimes.push(tMs);
  }

  /** Characters of correct words (plus the space after each), plus the right start of the unfinished word. */
  correctChars(): number {
    const words = this.challenge.words;
    let total = 0;
    this.committed.forEach(({ typed, spaced }, i) => {
      if (typed === words[i]) total += chars(words[i]).length + (spaced ? 1 : 0);
    });
    const next = words[this.committed.length];
    if (next !== undefined && next.startsWith(this.current)) total += chars(this.current).length;
    return total;
  }

  /** Every character left in the final text, right or wrong, plus spaces. */
  rawChars(): number {
    const committed = this.committed.reduce((sum, { typed, spaced }) => sum + chars(typed).length + (spaced ? 1 : 0), 0);
    return committed + chars(this.current).length;
  }

  /** Raw WPM for each full second of the test. */
  rawPerSecond(durationS: number): number[] {
    const counts: number[] = new Array(Math.floor(durationS)).fill(0);
    for (const t of this.keyTimes) {
      const bucket = Math.floor(t / 1000);
      if (bucket < counts.length) counts[bucket] += 1;
    }
    return counts.map((count) => (count * 60) / 5);
  }
}

export type LetterState = "untyped" | "correct" | "incorrect" | "extra";

/** How word `index` should look: one entry per letter, including extra typed letters. */
export function wordView(model: TypingModel, index: number): { letters: { char: string; state: LetterState }[]; error: boolean } {
  const target = chars(model.challenge.words[index]);
  const committed = model.committed[index];
  const typed = committed ? chars(committed.typed) : index === model.committed.length ? chars(model.current) : [];
  const letters = Array.from({ length: Math.max(target.length, typed.length) }, (_, j) => {
    if (j >= typed.length) return { char: target[j], state: "untyped" as const };
    if (j >= target.length) return { char: typed[j], state: "extra" as const };
    return { char: target[j], state: typed[j] === target[j] ? ("correct" as const) : ("incorrect" as const) };
  });
  return { letters, error: committed !== undefined && committed.typed !== model.challenge.words[index] };
}

/** Monkeytype's consistency: 100 when every second had the same raw speed. */
function consistency(perSecond: number[]): number {
  if (perSecond.length === 0) return 0;
  const mean = perSecond.reduce((a, b) => a + b, 0) / perSecond.length;
  if (mean === 0) return 0;
  const variance = perSecond.reduce((sum, x) => sum + (x - mean) ** 2, 0) / perSecond.length;
  const cov = Math.sqrt(variance) / mean;
  return 100 * (1 - Math.tanh(cov + cov ** 3 / 3 + cov ** 5 / 5));
}

/** One second of a run, for the results chart. */
export type SecondStats = { second: number; wpm: number; raw: number; errors: number };

/**
 * The run second by second, for the results chart (display only; the score is
 * `scoreTyping`): the speed so far as the result counts it, that second's raw speed, and its
 * wrong keystrokes. A last part-second counts as a second of its own.
 */
export function speedTimeline(challenge: TypingChallenge, events: TypingEvent[], durationS: number): SecondStats[] {
  const model = new TypingModel(challenge);
  const seconds = Math.ceil(durationS - 1e-9);
  const timeline: SecondStats[] = [];
  let next = 0;
  for (let second = 1; second <= seconds; second++) {
    const until = Math.min(second, durationS) * 1000;
    for (; next < events.length && events[next].t_ms <= until; next++) {
      const key = parseKey(events[next].key);
      if (key !== null) model.press(key, events[next].t_ms);
    }
    const span = Math.min(second, durationS) - (second - 1);
    // second n holds the keystrokes from n-1 s up to n s (the last one, up to the end)
    const inSecond = (t: number) => Math.min(Math.floor(t / 1000), seconds - 1) === second - 1;
    timeline.push({
      second,
      wpm: Math.round(model.correctChars() / 5 / (Math.min(second, durationS) / 60)),
      raw: Math.round((model.keyTimes.filter(inSecond).length * 60) / 5 / span),
      errors: model.errorTimes.filter(inSecond).length,
    });
  }
  return timeline;
}

export function scoreTyping(challenge: TypingChallenge, events: TypingEvent[]): TypingScore {
  const model = new TypingModel(challenge);
  const limitMs = challenge.limit * 1000;
  for (const event of events) {
    const key = parseKey(event.key);
    if (key === null) throw new Error(`unsupported key ${JSON.stringify(event.key)}`);
    if (challenge.mode === "time" && event.t_ms > limitMs) break;
    model.press(key, event.t_ms);
    if (model.done) break;
  }
  const durationS = challenge.mode === "time" ? challenge.limit : (model.finishedAt ?? 0) / 1000;
  if (!(durationS > 0)) throw new Error("the test was not finished");

  const minutes = durationS / 60;
  const correctChars = model.correctChars();
  const rawChars = model.rawChars();
  const rawPerSecond = model.rawPerSecond(durationS);
  return {
    wpm: round2(correctChars / 5 / minutes),
    raw: round2(rawChars / 5 / minutes),
    accuracy: model.totalKeys === 0 ? 0 : round2((model.correctKeys / model.totalKeys) * 100),
    consistency: round2(consistency(rawPerSecond)),
    correct_chars: correctChars,
    raw_chars: rawChars,
    duration_s: round2(durationS),
    raw_per_second: rawPerSecond,
  };
}
