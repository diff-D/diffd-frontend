// What the site shows about each test, without its play screen: this loads anywhere (the
// home page, the profile, unit tests in Node), while the registry pulls in the components.

/** How the home page and the 1v1 hub group games. */
export type Category = "speed" | "memory" | "words" | "numbers";

export const CATEGORIES: { id: Category; name: string; blurb: string }[] = [
  { id: "speed", name: "speed", blurb: "fast hands, fast eyes" },
  { id: "memory", name: "memory", blurb: "hold it in your head" },
  { id: "words", name: "words", blurb: "find the word before the clock does" },
  { id: "numbers", name: "numbers", blurb: "sums against the clock" },
];

export type TestInfo = {
  id: string;
  category: Category;
  name: string;
  /** One line on the home page, in our own words. */
  description: string;
  /** Font Awesome solid icon class, e.g. "fa-keyboard". */
  icon: string;
  /** The settings key of the default ranked settings: the home page shows that best. */
  defaultKey: string;
  /** Shown on a start screen before play; without it the play screen starts on its own. */
  howToPlay?: string;
  /** The big result: its label and how its value is written, e.g. "wpm" and "87". */
  primaryLabel: string;
  bigScore: (primary: number) => string;
  /** A score in one line, e.g. "87.4 wpm" or "level 9". */
  formatScore: (primary: number) => string;
  /** The live number during a 1v1, when it isn't the score itself; else `formatScore`. */
  formatProgress?: (value: number) => string;
  /** A paired phone can play it (its play screen calls `useRemote`). */
  remote?: boolean;
  /** Its settings sit in one inline bar (typing, Monkeytype-style) rather than a panel. */
  inlineSettings?: boolean;
};

const round2 = (x: number): number => Math.round(x * 100) / 100;

export const TYPING: TestInfo = {
  inlineSettings: true,
  category: "speed",
  id: "typing",
  name: "typing",
  description: "type the words as fast and as cleanly as you can",
  icon: "fa-keyboard",
  defaultKey: "time-30",
  primaryLabel: "wpm",
  bigScore: (wpm) => String(Math.round(wpm)),
  formatScore: (wpm) => `${round2(wpm)} wpm`,
};

export const REACTION: TestInfo = {
  category: "speed",
  id: "reaction",
  name: "reaction time",
  description: "click the moment the panel turns",
  icon: "fa-bolt",
  defaultKey: "rounds-5",
  primaryLabel: "average",
  bigScore: (ms) => `${ms} ms`,
  formatScore: (ms) => `${round2(ms)} ms`,
  formatProgress: (rounds) => `${rounds} rounds`,
};

export const NUMBER_MEMORY: TestInfo = {
  category: "memory",
  remote: true,
  id: "number_memory",
  name: "number memory",
  description: "remember a number that grows every level",
  icon: "fa-hashtag",
  defaultKey: "start-1",
  howToPlay: "a number flashes up; type it back once it's gone",
  primaryLabel: "level",
  bigScore: (level) => String(level),
  formatScore: (level) => `level ${level}`,
};

export const SEQUENCE_MEMORY: TestInfo = {
  category: "memory",
  remote: true,
  id: "sequence_memory",
  name: "sequence memory",
  description: "repeat a pattern of flashing tiles",
  icon: "fa-table-cells",
  defaultKey: "default",
  howToPlay: "watch the tiles light up, then repeat them in order: click them or press 7 8 9 / 4 5 6 / 1 2 3",
  primaryLabel: "level",
  bigScore: (level) => String(level),
  formatScore: (level) => `level ${level}`,
};

export const PATTERN_MEMORY: TestInfo = {
  category: "memory",
  remote: true,
  id: "pattern_memory",
  name: "pattern memory",
  description: "remember which tiles lit up, in any order",
  icon: "fa-border-all",
  defaultKey: "default",
  howToPlay: "tiles light up for a moment; click all of them, in any order; a wrong tile costs one of 3 lives",
  primaryLabel: "level",
  bigScore: (level) => String(level),
  formatScore: (level) => `level ${level}`,
};

export const VERBAL_MEMORY: TestInfo = {
  category: "memory",
  remote: true,
  id: "verbal_memory",
  name: "verbal memory",
  description: "say whether you've seen each word before",
  icon: "fa-book-open",
  defaultKey: "default",
  howToPlay: "for each word press s (or z) if it has come up in this run, n (or x) if it's new; three mistakes end it (practice: one to five)",
  primaryLabel: "score",
  bigScore: (points) => String(points),
  formatScore: (points) => `${points} points`,
};

export const MATHS: TestInfo = {
  category: "numbers",
  remote: true,
  id: "maths",
  name: "maths",
  description: "solve quick sums against the clock",
  icon: "fa-calculator",
  defaultKey: "medium-60-ramp",
  howToPlay: "type each answer: a right one goes in by itself; enter gives up on a problem and shows its answer",
  primaryLabel: "correct",
  bigScore: (correct) => String(correct),
  formatScore: (correct) => `${correct} correct`,
};

export const UNJUMBLE: TestInfo = {
  category: "words",
  remote: true,
  id: "unjumble",
  name: "unjumble",
  description: "unscramble words against the clock",
  icon: "fa-shuffle",
  defaultKey: "english_1k-3-8-60",
  howToPlay: "type the word the letters spell: it goes in by itself once it's right; shift + enter skips",
  primaryLabel: "solved",
  bigScore: (solved) => String(solved),
  formatScore: (solved) => `${solved} solved`,
};

/** The tea games (after Mudae's): words containing a group of three letters. */
const tea = (info: Omit<TestInfo, "category" | "defaultKey" | "bigScore" | "formatScore"> & { unit: string }): TestInfo => {
  const { unit, ...rest } = info;
  return { ...rest, category: "words", remote: true, defaultKey: "standard", bigScore: (n) => String(n), formatScore: (n) => `${n} ${unit}` };
};

export const BLACK_TEA = tea({
  id: "black_tea",
  name: "black tea",
  description: "a word with the letters before the timer runs out — three lives",
  icon: "fa-heart-crack",
  howToPlay: "type a word that contains the three letters and press enter; each group's timer gets shorter, and running out costs a life",
  primaryLabel: "words",
  unit: "words",
});

export const GREEN_TEA = tea({
  id: "green_tea",
  name: "green tea",
  description: "as many letter groups as you can in a minute",
  icon: "fa-mug-hot",
  howToPlay: "type a word that contains the three letters and press enter to move on; shift + enter skips",
  primaryLabel: "words",
  unit: "words",
});

export const RED_TEA = tea({
  id: "red_tea",
  name: "red tea",
  description: "the longest word you can find, round after round",
  icon: "fa-ruler-horizontal",
  howToPlay: "8 rounds of 12 seconds: find long words with the three letters; each round scores its longest word's letters",
  primaryLabel: "letters",
  unit: "letters",
});

export const YELLOW_TEA = tea({
  id: "yellow_tea",
  name: "yellow tea",
  description: "as many words as you can for each group",
  icon: "fa-layer-group",
  howToPlay: "5 rounds of 20 seconds: every different word with the three letters scores; press enter after each",
  primaryLabel: "words",
  unit: "words",
});

export const BLUE_TEA = tea({
  id: "blue_tea",
  name: "blue tea",
  description: "the letters in order, but apart — w · t · r makes water",
  icon: "fa-ellipsis",
  howToPlay: "type a word with the three letters in that order, anywhere in it (w · t · r: water) and press enter; shift + enter skips",
  primaryLabel: "words",
  unit: "words",
});

/** Every test, in the order the home page shows them. */
export const CATALOG: TestInfo[] = [
  TYPING,
  REACTION,
  NUMBER_MEMORY,
  SEQUENCE_MEMORY,
  PATTERN_MEMORY,
  VERBAL_MEMORY,
  MATHS,
  UNJUMBLE,
  BLACK_TEA,
  GREEN_TEA,
  RED_TEA,
  YELLOW_TEA,
  BLUE_TEA,
];

export function testInfo(id: string): TestInfo | undefined {
  return CATALOG.find((info) => info.id === id);
}
