import type { ResultsProps } from "../shell/types";
import { startLevel } from "./logic";
import type { SequenceMemoryChallenge, SequenceMemoryScore, SequenceMemorySettings } from "./types";

export default function SequenceMemoryResults(props: ResultsProps<SequenceMemorySettings, SequenceMemoryChallenge, SequenceMemoryScore>) {
  const start = () => startLevel(props.challenge);
  return (
    <p class="text-sub">
      tiles pressed: {props.events.length}
      {start() > 1 ? ` · started at level ${start()}` : ""}
    </p>
  );
}
