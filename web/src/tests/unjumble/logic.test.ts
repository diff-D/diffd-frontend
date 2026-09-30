import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { expectClose, loadFixtures } from "../fixtures";
import { accepts, scoreUnjumble, solveTimes, wrongGuessesByWord } from "./logic";
import type { UnjumbleChallenge, UnjumbleEvent, UnjumbleScore } from "./types";

const DICTIONARY = new Set(
  readFileSync(resolve(__dirname, "../../../../wordlists/unjumble_dictionary.txt"), "utf8").split("\n").filter(Boolean),
);
const isWord = (word: string) => DICTIONARY.has(word);

describe("unjumble scoring", () => {
  for (const fixture of loadFixtures("unjumble")) {
    test(`matches the shared fixture ${fixture.file}`, () => {
      // fixtures hold the server's challenge (with answers); the page only gets the scrambles
      const full = fixture.challenge as { time_s: number; entries: { scrambled: string }[] };
      const challenge = { time_s: full.time_s, scrambled: full.entries.map((entry) => entry.scrambled) };
      const score = scoreUnjumble(challenge, fixture.events as UnjumbleEvent[], isWord);
      const { solved, skipped, wrong_guesses } = fixture.expected.score as UnjumbleScore;
      expectClose(score, { solved, skipped, wrong_guesses });
      expectClose(score.solved, fixture.expected.primary, "primary");
    });
  }

  test("a guess counts when it uses the scramble's letters and is a word", () => {
    expect(accepts("ahwt", "What ", isWord)).toBe(true);
    expect(accepts("ahwt", "thaw", isWord)).toBe(true);
    expect(accepts("ahwt", "that", isWord)).toBe(false);
    expect(accepts("ahwt", "tahw", isWord)).toBe(false);
    // everyday words, not just the one the scramble was made from
    expect(accepts("hnic", "chin", isWord)).toBe(true);
    expect(accepts("rtahe", "earth", isWord)).toBe(true);
  });
});

describe("unjumble solve times", () => {
  const challenge: UnjumbleChallenge = { time_s: 60, scrambled: ["tca", "gdo", "rbid", "hisf"] };
  const events: UnjumbleEvent[] = [
    { t_ms: 1000, index: 0, guess: "tac" },
    { t_ms: 2500, index: 0, guess: "cat" },
    { t_ms: 3000, index: 1, skip: true },
    { t_ms: 7000, index: 2, guess: "bird" },
    { t_ms: 8000, index: 3, guess: "fshi" },
  ];

  test("solved words are timed from when they appeared, by length; skips are not", () => {
    expect(solveTimes(challenge, events, 3)).toEqual([
      { ms: 2500, label: "tca", category: "3 letters" },
      { ms: 4000, label: "rbid", category: "4 letters" },
    ]);
  });

  test("wrong guesses are counted per word, not the solving one", () => {
    expect(wrongGuessesByWord(events, 3)).toEqual([1, 0, 0, 1]);
  });
});
