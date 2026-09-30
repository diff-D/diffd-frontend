export type Tier = "easy" | "medium" | "hard";

export type Op = "add" | "subtract" | "multiply" | "divide";

/** `operations`: a subset of the tier's; absent means all of them. */
export type MathsSettings = { time_s: number; tier: Tier; operations?: Op[] };

export type Problem = { a: number; op: Op; b: number };

export type MathsChallenge = { time_s: number; problems: Problem[] };

export type MathsEvent = { t_ms: number; index: number; answer: number };

export type MathsScore = { correct: number; wrong: number; accuracy: number; per_minute: number };

/** What a live run of maths says (from the server); `at_ms`: when. */
export type MathsLive = { at_ms: number } & (
  | { type: "clock"; ends_in_ms: number }
  | { type: "problem"; index: number; a: number; op: Op; b: number }
  | { type: "right"; index: number; correct: number }
  | { type: "wrong"; index: number; answer: number; given: number }
  | { type: "over" }
);
