import { Show } from "solid-js";
import type { ResultsProps } from "../shell/types";
import Comparison from "./Comparison";
import type { NumberMemoryChallenge, NumberMemoryEvent, NumberMemoryScore, NumberMemorySettings } from "./types";

/** The last number against the last answer. */
export default function NumberMemoryResults(
  props: ResultsProps<NumberMemorySettings, NumberMemoryChallenge, NumberMemoryScore>,
) {
  const last = () => props.events.at(-1) as NumberMemoryEvent | undefined;
  return (
    <Show when={last()}>
      {(event) => <Comparison expected={props.challenge.numbers[event().level - 1]} given={event().answer} />}
    </Show>
  );
}
