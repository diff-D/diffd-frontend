export type WordList = "english" | "english_1k";

export type UnjumbleSettings = { time_s: number; min_len: number; max_len: number; word_list: WordList };

/**
 * The page gets only the scrambles; the answers stay on the server until the run is saved.
 * A live run's page gets none up front (only `time_s`), and once it's over the whole stored
 * challenge, whose words are `entries` (see `scrambles`).
 */
export type UnjumbleChallenge = { time_s: number; scrambled: string[]; entries?: { scrambled: string; answer: string }[] };

export type UnjumbleEvent = { t_ms: number; index: number; guess: string } | { t_ms: number; index: number; skip: true };

/** `answers`: from the server's score only (every word that was shown). */
export type UnjumbleScore = { solved: number; skipped: number; wrong_guesses: number; answers?: string[] };

/** What a live run of unjumble says (from the server); `at_ms`: when. */
export type UnjumbleLive = { at_ms: number } & (
  | { type: "clock"; ends_in_ms: number }
  | { type: "word"; index: number; scrambled: string }
  | { type: "right"; index: number; word: string; solved: number }
  | { type: "wrong"; index: number }
  | { type: "skipped"; index: number }
  | { type: "over" }
);
