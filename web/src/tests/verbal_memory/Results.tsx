import type { ResultsProps } from "../shell/types";
import type { VerbalMemoryChallenge, VerbalMemoryScore, VerbalMemorySettings } from "./types";

export default function VerbalMemoryResults(props: ResultsProps<VerbalMemorySettings, VerbalMemoryChallenge, VerbalMemoryScore>) {
  return <p class="text-sub">words shown: {props.events.length}</p>;
}
