import { Show } from "solid-js";
import Stat from "../../ui/Stat";
import type { ResultsProps } from "../shell/types";
import { gridSize, startLevel } from "./logic";
import type { PatternMemoryChallenge, PatternMemoryScore, PatternMemorySettings } from "./types";

export default function PatternMemoryResults(props: ResultsProps<PatternMemorySettings, PatternMemoryChallenge, PatternMemoryScore>) {
  const size = () => gridSize(Math.max(1, props.score.level));
  return (
    <div class="flex flex-wrap gap-12">
      <Stat label="grid" value={`${size()}×${size()}`} />
      <Stat label="lives left" value={props.score.lives_left} />
      <Show when={startLevel(props.challenge) > 1}>
        <Stat label="started at" value={`level ${startLevel(props.challenge)}`} />
      </Show>
    </div>
  );
}
