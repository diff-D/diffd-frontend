import { For, Show } from "solid-js";
import Stat from "../../ui/Stat";
import TimingStats from "../../ui/TimingStats";
import type { ResultsProps } from "../shell/types";
import { scrambles, solveTimes, wrongGuessesByWord } from "./logic";
import type { UnjumbleChallenge, UnjumbleEvent, UnjumbleScore, UnjumbleSettings } from "./types";

/**
 * The counts, how long each solved word took (overall and by length), then every word shown
 * with its answer (once the server has revealed them) and its wrong guesses.
 */
export default function UnjumbleResults(props: ResultsProps<UnjumbleSettings, UnjumbleChallenge, UnjumbleScore>) {
  const skippedAt = () => new Set((props.events as UnjumbleEvent[]).filter((e) => "skip" in e).map((e) => e.index));
  const moved = () => props.score.solved + props.score.skipped;
  const shown = () => Math.min(moved() + 1, scrambles(props.challenge).length);
  const events = () => props.events as UnjumbleEvent[];
  const wrong = () => wrongGuessesByWord(events(), moved());
  const lengths = () => [...new Set(scrambles(props.challenge).map((word) => `${[...word].length} letters`))].sort((a, b) => parseInt(a) - parseInt(b));
  const status = (i: number) => (i >= moved() ? "unfinished" : skippedAt().has(i) ? "skipped" : "solved");

  return (
    <>
      <div class="flex flex-wrap gap-12">
        <Stat label="skipped" value={props.score.skipped} />
        <Stat label="wrong guesses" value={props.score.wrong_guesses} />
      </div>
      <TimingStats items={solveTimes(props.challenge, events(), moved())} categories={{ title: "average by length", order: lengths() }} />
      <ul data-testid="answers" class="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-4">
        <For each={scrambles(props.challenge).slice(0, shown())}>
          {(scramble, i) => (
            <li class="flex gap-2" title={status(i())}>
              <span class="text-sub">{scramble}</span>
              <span class="text-sub">→</span>
              <span class={status(i()) === "solved" ? "text-main" : "text-error"}>{props.score.answers?.[i()] ?? "…"}</span>
              <Show when={wrong()[i()]}>{(count) => <span class="text-sub">✗{count()}</span>}</Show>
            </li>
          )}
        </For>
      </ul>
    </>
  );
}
