import { createSignal, onCleanup } from "solid-js";
import { errorMessage, runs } from "../../api/client";
import type { Mode } from "../../api/types";
import { endFocus, startFocus } from "../../state/focus";
import { notify } from "../../state/notices";
import { type LiveRun, createLiveRun } from "./live";
import { createOutcome } from "./outcome";
import type { AnyTestDef } from "./types";

type Phase = "loading" | "failed" | "ready" | "playing" | "finished";

/**
 * A run the server has started: what the test is played with (`key`: its board). `live`: it
 * is played live, and `challenge` is only its rules until it's over.
 */
export type Run = { id: string; mode: Mode; settings: unknown; challenge: unknown; key?: string; live?: LiveRun };

/**
 * The runs of one test page: starting them (only the latest request counts), playing,
 * scoring locally with the test's rules and saving (see outcome.ts).
 */
export function createRun(def: AnyTestDef, restart: () => void) {
  const [phase, setPhase] = createSignal<Phase>("loading");
  const [run, setRun] = createSignal<Run>();
  const [events, setEvents] = createSignal<unknown[]>([]);
  const [failure, setFailure] = createSignal("");
  const { outcome, save, settle, clear } = createOutcome<unknown>();
  let latest = 0;
  onCleanup(() => run()?.live?.close());

  function fail(message: string) {
    setFailure(message);
    setPhase("failed");
  }

  /** `daily`: today's daily challenge instead (see api `runs.start`). */
  async function start(mode: Mode, settings: unknown, daily = false) {
    const request = ++latest;
    endFocus();
    clear();
    run()?.live?.close();
    setRun(undefined);
    setPhase("loading");
    // a ranked run of a test with answers to hide is played live: the server has the words
    const live = def.live === true && mode === "ranked";
    // otherwise unjumble's dictionary downloads alongside the run
    const prepared = ((!live && def.prepare?.load()) || Promise.resolve()).then(
      () => true,
      () => false,
    );
    try {
      const started = await runs.start<unknown>(def.id, mode, settings, daily);
      const ready = await prepared;
      if (request !== latest) return;
      if (!ready) return fail(def.prepare?.error ?? "couldn't start a test");
      const liveRun = started.live ? createLiveRun(started.run_id) : undefined;
      setRun({ id: started.run_id, mode, settings, challenge: started.challenge, key: started.settings_key, live: liveRun });
      setPhase("ready");
    } catch (err) {
      if (request !== latest) return;
      // a daily challenge already played says so in place of the game
      if (daily) return fail(errorMessage(err));
      notify(errorMessage(err));
      fail("couldn't start a test");
    }
  }

  function began() {
    if (phase() !== "ready") return;
    setPhase("playing");
    startFocus();
  }

  /** Called by the play screen of run `id`; a finished or replaced run is ignored. */
  function finish(id: string, played: unknown[]) {
    const current = run();
    if (current?.id !== id || (phase() !== "ready" && phase() !== "playing")) return;
    if (current.live) return finishLive(current, current.live);
    let local: unknown;
    try {
      local = def.score(current.challenge, played);
    } catch {
      notify("couldn't score this run, starting a new one");
      restart();
      return;
    }
    setEvents(played);
    const saving = save(id, played, local);
    setPhase("finished");
    endFocus();
    void saving.then((res) => {
      if (import.meta.env.DEV && res && res.primary_score !== def.primary(local)) {
        console.warn(`local and server ${def.id} scores differ`, def.primary(local), res.primary_score);
      }
    });
  }

  /** A live run is over: the server saved it, and now sends the challenge and events. */
  async function finishLive(current: Run, live: LiveRun) {
    const done = await settle(live.result, async (done) => {
      // the results may read the words (tea's misses): the run is over, they can come now
      await def.prepare?.load().catch(() => undefined);
      if (run()?.id !== current.id) return false;
      setRun({ ...current, challenge: done.challenge });
      setEvents(done.events);
      setPhase("finished");
      endFocus();
      return true;
    });
    if (!done.ok && run()?.id === current.id) {
      notify(`${done.message}, starting a new one`);
      restart();
    }
  }

  return { phase, run, events, failure, outcome, start, began, finish };
}
