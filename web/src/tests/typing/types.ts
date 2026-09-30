export type TypingMode = "time" | "words";

export type WordList = "english" | "english_1k";

/** Sent as run settings; only the length of the chosen mode (time_s or words) matters. */
export type TypingSettings = {
  mode: TypingMode;
  time_s: number;
  words: number;
  word_list: WordList;
  punctuation: boolean;
  numbers: boolean;
};

export type TypingChallenge = { mode: TypingMode; limit: number; words: string[] };

/** `key`: one character, "Space" or "Backspace". `t_ms`: since the first keystroke. */
export type TypingEvent = { t_ms: number; key: string };

export type TypingScore = {
  wpm: number;
  raw: number;
  accuracy: number;
  consistency: number;
  correct_chars: number;
  raw_chars: number;
  duration_s: number;
  raw_per_second: number[];
};
