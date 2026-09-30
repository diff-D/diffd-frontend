// What the server's API sends, as it sends it.

export type User = {
  id: string;
  username: string;
  email: string | null;
  created_at: string;
  role: Role;
};

export type Me = { kind: "user"; user: User; backup_codes_remaining: number } | { kind: "guest" };

export type RegisterResponse = { user: User; backup_codes: string[] };
export type LoginResponse = { user: User };

export type Settings = { theme: string | null; font: string | null };

export type Mode = "ranked" | "practice";

export type StartRunResponse<C> = {
  run_id: string;
  test: string;
  mode: Mode;
  settings: unknown;
  settings_key: string;
  /** For a live run, only its rules and clock. */
  challenge: C;
  /** Played live over `runs.liveUrl`: the server shows one question at a time. */
  live: boolean;
};

export type FinishRunResponse<S> = {
  run_id: string;
  score: S;
  primary_score: number;
  is_pb: boolean;
};

export type RunSummary = {
  id: string;
  test: string;
  mode: Mode;
  settings: unknown;
  settings_key: string;
  score: unknown;
  primary_score: number;
  finished_at: string;
};

export type HistoryResponse = { runs: RunSummary[]; next_cursor: string | null };

/** The best ranked run on one board. */
export type Best = {
  test: string;
  settings_key: string;
  primary_score: number;
  run_id: string;
  finished_at: string;
};

export type BestsResponse = { bests: Best[] };

/** A finished 1v1 from the player's side; `opponent` is absent for a guest. */
export type DuelSummary = {
  id: string;
  test: string;
  settings_key: string;
  mode: Mode;
  outcome: "win" | "loss" | "draw";
  score: number | null;
  opponent_score: number | null;
  opponent: string | null;
  finished_at: string;
};

export type DuelHistoryResponse = { duels: DuelSummary[]; next_cursor: string | null };

/**
 * One game on a profile:
 * `practice_runs` on your own profile only; `bests` one per ranked board played; `trend` the
 * latest ranked scores on the board played last, oldest first.
 */
export type GameSummary = {
  test: string;
  runs: number;
  practice_runs?: number;
  time_ms: number;
  last_at: string;
  wins: number;
  losses: number;
  draws: number;
  bests: Best[];
  trend: number[];
  /** The board of `trend`: the one played last. */
  trend_key: string | null;
};

export type RecentRun = {
  id: string;
  test: string;
  mode: Mode;
  settings_key: string;
  primary_score: number;
  finished_at: string;
  duel?: { outcome: "win" | "loss" | "draw"; opponent: string | null };
};

/** A profile at a glance; `activity` is the last year's days with runs (`YYYY-MM-DD`), newest first. */
export type ProfileSummary = {
  totals: { runs: number; time_ms: number; games: number; wins: number; losses: number; draws: number; streak: number; last_active: string | null };
  activity: { day: string; runs: number }[];
  games: GameSummary[];
  recent: RecentRun[];
};

/** A game in detail: `scores` on board `settings_key`, oldest first (at most 100). */
export type GameDetail = { game: GameSummary; settings_key: string; scores: { primary_score: number; finished_at: string }[] };

/** The visitor's relation to a profile's user (absent for strangers and guests). */
export type Relation = { status: "me" | "friends" | "requested" | "incoming"; request_id?: string };

/** The kinds of organisation (server: `OrgKind`). */
export type OrgKind = "company" | "school" | "group" | "friends" | "team" | "club" | "other";

/** An organisation a player is in, or (your own) has asked to join. */
export type Membership = { tag: string; name: string; kind: OrgKind; status: "member" | "pending" };

/** A bio, organisations, and the one whose tag is shown before the name. */
export type About = { bio: string | null; display: string | null; organisations: Membership[] };

export type UserProfile = { username: string; joined_at: string; about: About; summary: ProfileSummary; relation?: Relation };

/** An organisation as a search finds it. */
export type OrgSummary = { tag: string; name: string; kind: OrgKind; open: boolean; aliases: string[]; members: number };

/** An organisation's page: `pending` for whoever runs it; `you`: the visitor's place in it. */
export type Organisation = OrgSummary & {
  owner: string | null;
  created_at: string;
  members_list: { username: string; since: string }[];
  pending?: { username: string; since: string }[];
  you?: "owner" | "member" | "pending";
  manage: boolean;
};

export type PendingRequest = { id: string; username: string; sent_at: string };

export type FriendsResponse = {
  /** Online friends first. */
  friends: { username: string; org_tag?: string; since: string; online: boolean }[];
  incoming: PendingRequest[];
  outgoing: PendingRequest[];
  max: number;
};

/** `user`: `name` is an account's username (else it is a guest). */
export type DuelPlayer = { name: string; user: boolean };

/** Messages on the 1v1 socket. */
export type DuelMatched = {
  type: "matched";
  duel_id: string;
  run_id: string;
  test: string;
  /** `practice` in a friend's room with practice settings. */
  mode: Mode;
  settings: unknown;
  settings_key: string;
  challenge: unknown;
  /** Played live (see `StartRunResponse`). */
  live: boolean;
  you: DuelPlayer;
  opponent: DuelPlayer;
  countdown_ms: number;
};

/** `rematch`: the room offers one (invite rooms, both players still here). */
export type DuelResult = { type: "result"; outcome: "win" | "loss" | "draw"; you: number | null; opponent: number | null; rematch: boolean };

/** Where a player's caret is, for tests that have one (typing). */
export type DuelCaret = { word: number; letter: number };

/** Paired: both players say ready within `ready_ms`, or the room closes. */
/** `settings`: a friend's room with practice settings (absent: the ranked game). */
export type DuelLobby = { type: "lobby"; test: string; settings?: unknown; you: DuelPlayer; opponent: DuelPlayer; ready_ms: number };

export type DuelServerMessage =
  | { type: "waiting"; invite?: string }
  | DuelLobby
  | { type: "ready_state"; you: boolean; opponent: boolean }
  | { type: "lobby_closed"; reason: "timeout" | "opponent_left" }
  | { type: "invite_declined"; by: string }
  | DuelMatched
  | { type: "progress"; value: number; caret?: DuelCaret }
  | { type: "opponent_finished"; score: number }
  | { type: "opponent_left" }
  | DuelResult
  | { type: "rematch_wanted" }
  | { type: "error"; code: string; message: string };

/** What the page sends. */
export type DuelClientMessage =
  | { type: "progress"; value: number; caret?: DuelCaret }
  | { type: "finished" }
  | { type: "rematch" }
  | { type: "ready" };

/** Messages on the live socket. */
/** `practice`: the room plays practice settings, not the ranked game. */
export type LiveChallenge = { type: "challenge"; id: string; from: string; test: string; practice: boolean; room: string; expires_at: string };

export type LiveMessage =
  | { type: "friend_request"; request_id: string; from: string }
  | { type: "friend_accepted"; by: string }
  | LiveChallenge
  | { type: "party_invite"; from: string; room: string }
  | { type: "challenge_cancelled"; id: string };

/** Admin views. */
/** Moderators ban and sign people out; admins do everything. */
export type Role = "user" | "moderator" | "admin";

/** `email` is hidden from moderators. */
export type AdminUser = {
  id: string;
  username: string;
  email: string | null;
  role: Role;
  banned_at: string | null;
  created_at: string;
  runs: number;
  last_seen_at: string | null;
  /** Allowed to create organisations before the account is 30 days old. */
  orgs_allowed: boolean;
};

export type AdminUsersResponse = { users: AdminUser[]; next_cursor: string | null };

export type AdminAction = { id: string; admin: string; action: string; run_id: string | null; detail: Record<string, unknown>; created_at: string };

/** A user's play of one game; `best` on its default board and `better_than` the share (0-100) of that board's other players they beat. */
export type AdminUserGame = {
  test: string;
  runs: number;
  practice_runs: number;
  time_ms: number;
  wins: number;
  losses: number;
  draws: number;
  best: number | null;
  better_than: number | null;
  /** Their place among the board's players (ties share it). */
  rank: number | null;
  players: number;
};

/** `games`: for admins only (moderators see no analytics). */
export type AdminUserDetail = { user: AdminUser; runs: RunSummary[]; actions: AdminAction[]; games?: AdminUserGame[] };

/** One game across everyone. */
export type AdminGame = { test: string; players: number; guests: number; runs: number; practice_runs: number; time_ms: number; last_at: string | null };

/**
 * One ranked board over a period: its players' bests as skill percentiles (`p` 90: ahead of
 * 90% of players) and a histogram (scores ascending), its runs, and its runs per day.
 */
export type GameAnalytics = {
  test: string;
  settings_key: string;
  players: number;
  runs: number;
  percentiles: { p: number; value: number }[];
  histogram: { min: number; max: number; counts: number[] } | null;
  days: { day: string; runs: number }[];
};

/** Phone remotes. */
export type RemoteDevice = { id: string; label: string; paired_at: string; last_used_at: string };

export type RemoteMessage =
  | { type: "phones"; count: number }
  | { type: "input"; action: unknown }
  | { type: "desk"; online: boolean }
  | { type: "screen"; spec: unknown }
  | { type: "replaced" }
  /**
   * During a live run, straight from the server: whether the phone's answer was right (none
   * for a skip) and the question that came next (its number, and the prompt the phone shows).
   */
  | { type: "answered"; good?: boolean; next?: { index: number; prompt?: string } };

/** Parties. */
/** `away`: their connection dropped; the seat waits a little for them. */
export type PartyMember = { id: string; name: string; tag?: string; user: boolean; ready: boolean; points: number; playing: boolean; away: boolean };

/** `settings`: the game's practice settings; absent for the ranked game. */
export type PartyState = {
  type: "state";
  code: string;
  host: string;
  stage: "lobby" | "playing";
  game: string | null;
  settings?: unknown;
  /** The game loads on the pages instead of being played live: practice, off the boards. */
  local: boolean;
  members: PartyMember[];
};

export type PartyStarted = {
  type: "started";
  test: string;
  mode: Mode;
  run_id: string;
  settings: unknown;
  settings_key: string;
  /** For a live run, only its rules and clock. */
  challenge: unknown;
  /** Played live (see `StartRunResponse`). */
  live: boolean;
  countdown_ms: number;
};

export type PartyPlacing = { id: string; name: string; score: number | null; place: number | null; points: number };

/** `game`: the party's number for it, from 1. */
export type PartyResults = { type: "results"; game: number; test: string; placings: PartyPlacing[] };

/** A player's run of one of the party's games, in full. */
export type PartyRunResult = {
  type: "run_result";
  game: number;
  id: string;
  test: string;
  mode: Mode;
  settings: unknown;
  challenge: unknown;
  score: unknown;
  events: unknown[];
};

/**
 * `kind` marks sketch's lines: `insider` (said among the drawer and those who have the
 * word), `guessed` (someone got it), `hidden` (your guess, too near the word for the
 * others to see; `close`: one letter off).
 */
export type PartyChatLine = { id: string; name: string; text: string; kind?: "insider" | "guessed" | "hidden"; close?: boolean };

/**
 * A step of a sketch drawing (as the server checks it): colours are `0xRRGGBB`,
 * points `x, y, x, y…`.
 */
export type SketchOp =
  | { k: "line"; c: number; w: number; p: number[] }
  | { k: "more"; p: number[] }
  | { k: "fill"; c: number; x: number; y: number }
  | { k: "undo" }
  | { k: "clear" };

export type SketchScore = { id: string; points: number };

/** Sketch's turn as you may see it: `word` only for the drawer or once revealed. */
export type SketchState = {
  type: "sketch";
  phase: "choosing" | "drawing" | "reveal";
  drawer: string;
  round: number;
  rounds: number;
  turn: number;
  turns: number;
  ends_in_ms: number;
  mask?: string;
  word?: string;
  guessed: string[];
  scores: SketchScore[];
  gains: SketchScore[];
  ops: SketchOp[];
};

export type PartyMessage =
  | { type: "joined"; id: string; code: string; rejoin: string }
  | PartyState
  | PartyStarted
  | { type: "progress"; id: string; value: number }
  | { type: "finished"; id: string; score: number }
  | PartyResults
  | PartyRunResult
  | ({ type: "chat" } & PartyChatLine)
  | SketchState
  | { type: "sketch_words"; words: string[] }
  | { type: "sketch_draw"; ops: SketchOp[] }
  | { type: "sketch_hint"; mask: string }
  | { type: "sketch_guessed"; id: string; name: string }
  | { type: "sketch_hidden"; text: string; close: boolean }
  | { type: "error"; code: string; message: string };

export type PartyClientMessage =
  | { type: "ready"; ready: boolean }
  | { type: "pick"; test: string; settings?: unknown; local?: boolean }
  | { type: "start" }
  | { type: "kick"; id: string }
  | { type: "progress"; value: number }
  | { type: "finished" }
  | { type: "chat"; text: string }
  | { type: "result"; game: number; id: string }
  | { type: "rename"; name: string }
  | { type: "sketch_pick"; index: number }
  | { type: "sketch_draw"; ops: SketchOp[] };

/** A leaderboard page. */
export type LeaderboardEntry = { rank: number; username: string; org_tag?: string; primary_score: number; finished_at: string };

export type LeaderboardPeriod = "all" | "weekly" | "daily";

export type LeaderboardResponse = {
  test: string;
  settings_key: string;
  period: LeaderboardPeriod;
  entries: LeaderboardEntry[];
  next_cursor: string | null;
  /** Your place, when signed in and on this board. */
  you?: { rank: number; primary_score: number };
};

/** Today's daily challenge. */
export type DailyInfo = {
  date: string;
  test: string;
  settings_key: string;
  played: "none" | "started" | "finished";
  score: number | null;
  /** Days in a row you finished it. */
  streak: number;
};

export type AdminOverview = { users: number; banned: number; runs: number; runs_today: number; online: number; parties: number };
