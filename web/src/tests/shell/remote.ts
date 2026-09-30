import { createEffect, onCleanup } from "solid-js";
import type { Verdict } from "./feedback";
import type { LiveRun } from "./live";

/** The last answer's verdict, to flash on the phone too (`id` tells one flash from the next). */
export type RemoteVerdict = { verdict: Verdict; id: number };

/**
 * A test's controls on the phone: a number pad, a text box, a grid of tiles, or a few big
 * buttons. In a live run (`live`), the phone gives its answers straight to the server, for
 * the question `index`, and hears from it whether they were right (see `useRemote`).
 */
export type RemoteControl =
  | { kind: "keypad"; value: string; enter: string; verdict?: RemoteVerdict; live?: boolean; index?: number }
  /**
   * A word to type on the phone's own keyboard: `prompt` is what to solve (the letters);
   * the phone clears its box whenever `clear` changes; `note` says why a word didn't count.
   */
  | { kind: "text"; prompt: string; clear: number; enter: string; skip?: string; note?: string; verdict?: RemoteVerdict; live?: boolean; index?: number }
  | { kind: "grid"; cols: number; tiles: number; active: boolean }
  | { kind: "choice"; options: { id: string; label: string }[] };

/**
 * What a paired phone shows while a test is on screen (the server passes it on as is): the
 * test's controls, a message, one big button, or (`start`) the controls to come, greyed out
 * under `text`, a tap anywhere starting the test (to size the controls before it begins).
 */
export type RemoteSpec = RemoteControl | { kind: "wait"; text: string } | { kind: "next"; text: string } | { kind: "start"; preview: RemoteControl; text: string };

/** What the phone sends back when something is pressed. */
export type RemoteAction =
  | { type: "key"; key: string }
  | { type: "back" }
  | { type: "enter" }
  /** The phone's text box now holds `value`. */
  | { type: "text"; value: string }
  | { type: "skip" }
  | { type: "tap"; tile: number }
  | { type: "choose"; id: string }
  | { type: "next" }
  /**
   * In a live run: what the phone gave the server (the page just shows it), while the phone
   * had question `shown` on screen.
   */
  | { type: "live"; input: { type: "typed" | "enter" | "skip"; value?: string; index?: number }; shown?: number };

/** The page's side of the phone link, handed to play screens (see `state/remote.ts`). */
export type RemoteLink = {
  show: (spec: RemoteSpec | null) => void;
  onAction: (handler: (action: RemoteAction) => void) => () => void;
  /** The live run on screen (or none): a phone's answers go straight to it. */
  run: (runId: string | null) => void;
};

/**
 * Connects a play screen to the phone while it is mounted: the phone shows `spec()` (kept
 * up to date), and what is pressed there goes to `handle`, like a key or click here. In a
 * live run (`live`), the phone answers the server itself (no trip through this page) and
 * hears the verdicts from it; this page is shown what it typed (a `live` action).
 */
export function useRemote(link: RemoteLink | undefined, spec: () => RemoteSpec | null, handle: (action: RemoteAction) => void, live?: LiveRun): void {
  if (!link) return;
  createEffect(() => {
    const shown = spec();
    link.show(live && shown && (shown.kind === "keypad" || shown.kind === "text") ? { ...shown, live: true, verdict: undefined } : shown);
  });
  if (live) link.run(live.runId);
  const off = link.onAction(handle);
  onCleanup(() => {
    off();
    if (live) link.run(null);
    link.show(null);
  });
}
