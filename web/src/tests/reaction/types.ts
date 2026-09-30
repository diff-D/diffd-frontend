export type ReactionSettings = { rounds: number };

export type ReactionChallenge = {
  rounds: number;
  /** Delay before "go" for each attempt (successful or early), in order. */
  delays_ms: number[];
};

export type ReactionEvent = { t_ms: number; kind: "round_start" | "go" | "click" };

export type ReactionScore = { rounds_ms: number[]; average_ms: number; early_clicks: number };

/** What a live run of reaction says (from the server); `at_ms`: when. */
export type ReactionLive = { at_ms: number } & (
  | { type: "ready"; rounds: number }
  | { type: "waiting"; round: number }
  | { type: "go" }
  | { type: "early" }
  | { type: "round"; ms: number; done: number }
  | { type: "over" }
);
