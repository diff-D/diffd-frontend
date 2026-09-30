import { For } from "solid-js";
import Stat from "../../ui/Stat";
import TimingStats from "../../ui/TimingStats";
import type { ResultsProps } from "../shell/types";
import type { ReactionChallenge, ReactionScore, ReactionSettings } from "./types";

export default function ReactionResults(props: ResultsProps<ReactionSettings, ReactionChallenge, ReactionScore>) {
  return (
    <>
      <div class="flex flex-wrap items-end gap-12">
        <For each={props.score.rounds_ms}>{(ms, i) => <Stat label={`round ${i() + 1}`} value={`${ms} ms`} />}</For>
      </div>
      <p class="text-sub">early clicks: {props.score.early_clicks}</p>
      <TimingStats items={props.score.rounds_ms.map((ms, i) => ({ ms, label: `round ${i + 1}` }))} precise />
    </>
  );
}
