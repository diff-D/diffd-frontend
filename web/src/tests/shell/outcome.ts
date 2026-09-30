import { createSignal } from "solid-js";
import { errorMessage, runs } from "../../api/client";
import type { FinishRunResponse } from "../../api/types";
import type { LiveResult } from "./live";
import { notify } from "../../state/notices";

/** A finished run: the local score until the server's arrives (`saved: null` = saving). */
export type Outcome<S> = { score: S; isPb: boolean | null; saved: boolean | null; retry: () => void };

/**
 * The outcome of the latest finished run. Each save belongs to its own run: a slow reply for
 * an earlier run never replaces a later one, and retry sends the same run again.
 */
export function createOutcome<S>() {
  const [outcome, setOutcome] = createSignal<Outcome<S>>();
  let latest = 0;

  async function save(runId: string, events: unknown[], local: S): Promise<FinishRunResponse<S> | undefined> {
    const attempt = ++latest;
    const retry = () => void save(runId, events, local);
    setOutcome({ score: local, isPb: null, saved: null, retry });
    try {
      const res = await runs.finish<S>(runId, events);
      if (attempt === latest) setOutcome({ score: res.score, isPb: res.is_pb, saved: true, retry });
      return res;
    } catch (err) {
      notify(errorMessage(err));
      if (attempt === latest) setOutcome({ score: local, isPb: null, saved: false, retry });
      return undefined;
    }
  }

  /**
   * A live run's outcome: the server saved it once it was over. `ready` runs first (to put
   * the challenge and events the results are drawn from in place); false from it drops it.
   */
  async function settle(result: Promise<LiveResult>, ready: (done: Extract<LiveResult, { ok: true }>) => boolean | Promise<boolean>): Promise<LiveResult> {
    const attempt = ++latest;
    const done = await result;
    if (!done.ok || attempt !== latest) return done;
    if ((await ready(done)) && attempt === latest) setOutcome({ score: done.score as S, isPb: done.is_pb, saved: true, retry: () => {} });
    return done;
  }

  function clear() {
    latest++;
    setOutcome(undefined);
  }

  return { outcome, save, settle, clear };
}
