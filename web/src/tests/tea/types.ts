/** Practice options (as the server has them); ranked sends none. */
export type TeaSettings = { time_s?: number; lives?: number; start_s?: number; rounds?: number; round_s?: number };

/** How a tea run is played (as the server has them). */
export type TeaRules =
  | { kind: "survival"; lives: number; start_ms: number; min_ms: number; step_ms: number }
  | { kind: "race"; time_s: number; scattered: boolean }
  | { kind: "rounds"; rounds: number; round_ms: number; count: "longest" | "most" };

export type TeaChallenge = { groups: string[]; rules: TeaRules };

export type TeaEvent = { t_ms: number; word: string } | { t_ms: number; skip: true };

export type TeaScore = { points: number; words: string[]; wrong: number; skipped: number; missed: number };

/** What a live run of tea says (from the server); `at_ms`: when. */
export type TeaLive = { at_ms: number } & (
  | { type: "group"; round: number; group: string; ends_in_ms: number; lives: number }
  | { type: "accepted"; word: string; points: number; gained: number }
  | { type: "rejected"; why: "no_group" | "used" | "not_a_word" }
  | { type: "missed"; group: string; examples: string[]; longest: boolean; lives: number }
  | { type: "over" }
);
