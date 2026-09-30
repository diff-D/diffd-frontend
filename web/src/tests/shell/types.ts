import type { Component } from "solid-js";
import type { DuelCaret } from "../../api/types";
import type { TestInfo } from "../catalog";
import type { LiveRun } from "./live";
import type { RemoteControl, RemoteLink } from "./remote";
import type { TestSettings } from "./settings";

/** What the shell gives a test's play screen. */
export type PlayProps<S, C> = {
  challenge: C;
  settings: S;
  /** The player has begun (first key or click): header, footer and settings fade out. */
  started: () => void;
  /** The run is over; the shell scores the events with the test's rules and saves them. */
  finish: (events: unknown[]) => void;
  /** The live number a 1v1 opponent sees (live wpm, level reached, …), and the caret for
   * tests that have one; unused elsewhere. */
  progress?: (value: number, caret?: DuelCaret) => void;
  /** In a 1v1: where the opponent's caret is (typing draws it). */
  opponentCaret?: DuelCaret;
  /** A paired phone: tests that support one show their controls on it (`useRemote`). */
  remote?: RemoteLink;
  /**
   * A live run (ranked, daily, 1v1, party): `challenge` holds only the rules and clock; the
   * questions come from here one at a time and the answers go back (see live.ts). The play
   * screen begins it once it's on screen, and calls `finish([])` once it's over.
   */
  live?: LiveRun;
};

/** What a test's result details are drawn from (the score becomes the server's once saved). */
export type ResultsProps<S, C, Score> = { score: Score; settings: S; challenge: C; events: unknown[] };

/** A playable test: its catalog entry plus play screen, results, settings and scoring. */
export type TestDef<S, C, Score> = TestInfo & {
  settings: TestSettings<S>;
  Play: Component<PlayProps<S, C>>;
  Results: Component<ResultsProps<S, C, Score>>;
  /** Local scoring with the server's rules (logic.ts); throws on events it can't score. */
  score: (challenge: C, events: unknown[]) => Score;
  primary: (score: Score) => number;
  /** More big numbers beside the primary one (typing's accuracy). */
  headline?: (score: Score) => { label: string; value: string }[];
  /** Ranked (and 1v1, party) runs are played live: see `PlayProps.live`. */
  live?: true;
  /** A test a phone can play: its controls as they first look, shown before it starts. */
  remotePreview?: RemoteControl;
  /** Something to download before a run can be played (unjumble's dictionary). */
  prepare?: { load: () => Promise<unknown>; loading: string; error: string };
};

/** The registry holds tests of different types; each definition is type-checked where it is written. */
export type AnyTestDef = TestDef<any, any, any>;
