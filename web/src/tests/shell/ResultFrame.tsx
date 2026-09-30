import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { copyText } from "../../ui/clipboard";
import Stat from "../../ui/Stat";
import { notify } from "../../state/notices";
import type { Outcome } from "./outcome";
import type { Run } from "./run";
import type { AnyTestDef } from "./types";

/** A finished run: the big score, practice/PB tags, the test's details and save status. */
/** `links: false` leaves out the links elsewhere (a party's look back at a game). */
export default function ResultFrame(props: { def: AnyTestDef; outcome: Outcome<unknown>; run: Run; events: unknown[]; links?: boolean }) {
  const score = () => props.outcome.score;

  /** "diff'D · maths: 32 correct (ranked)", and where to play it. */
  function share() {
    const daily = props.run.key?.startsWith("daily-");
    const kind = daily ? `daily challenge ${props.run.key!.slice("daily-".length)}` : props.run.mode;
    const text = `diff'D · ${props.def.name}: ${props.def.formatScore(props.def.primary(score()))} (${kind})\n${location.origin}${daily ? "/daily" : `/t/${props.def.id}`}`;
    copyText(text).then(
      () => notify("result copied"),
      () => notify("couldn't copy the result"),
    );
  }
  return (
    <div class="flex flex-col gap-8">
      <div class="flex flex-wrap items-end gap-12">
        <Stat label={props.def.primaryLabel} value={props.def.bigScore(props.def.primary(score()))} big testId="primary-score" />
        <For each={props.def.headline?.(score()) ?? []}>{(stat) => <Stat label={stat.label} value={stat.value} big />}</For>
        <Show when={props.run.mode === "practice"}>
          <span class="mb-3 rounded-lg bg-sub-alt px-3 py-1 text-sub">practice</span>
        </Show>
        <Show when={props.outcome.isPb}>
          <span class="mb-3 rounded-lg bg-main px-3 py-1 text-bg">new personal best</span>
        </Show>
      </div>
      <Dynamic
        component={props.def.Results}
        score={score()}
        settings={props.run.settings}
        challenge={props.run.challenge}
        events={props.events}
      />
      <Show when={props.links !== false}>
      <nav aria-label="more" class="flex flex-wrap gap-4 text-sm">
        <A
          href={props.run.key?.startsWith("daily-") ? `/leaderboards/${props.def.id}?key=${props.run.key}` : `/leaderboards/${props.def.id}`}
          class="btn-text !px-0"
        >
          <i class="fa-solid fa-trophy" /> leaderboard
        </A>
        <A href={`/duel/${props.def.id}`} class="btn-text !px-0">
          <i class="fa-solid fa-user-group" /> play a 1v1
        </A>
        <A href="/party" class="btn-text !px-0">
          <i class="fa-solid fa-people-group" /> play with a group
        </A>
        <button type="button" class="btn-text !px-0" onClick={share}>
          <i class="fa-solid fa-share-nodes" /> share
        </button>
      </nav>
      </Show>
      <Show when={props.outcome.saved === null}>
        <p class="text-sub">saving…</p>
      </Show>
      <Show when={props.outcome.saved === false}>
        <p class="flex items-center gap-4 text-error">
          not saved
          <button type="button" class="btn" onClick={() => props.outcome.retry()}>
            retry
          </button>
        </p>
      </Show>
    </div>
  );
}
