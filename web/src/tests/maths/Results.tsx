import Stat from "../../ui/Stat";
import TimingStats from "../../ui/TimingStats";
import type { ResultsProps } from "../shell/types";
import { SYMBOLS, answerTimes } from "./logic";
import type { MathsChallenge, MathsEvent, MathsScore, MathsSettings } from "./types";

/** Speed and accuracy, then how long each right answer took, overall and per operator. */
export default function MathsResults(props: ResultsProps<MathsSettings, MathsChallenge, MathsScore>) {
  return (
    <>
      <div class="flex flex-wrap gap-12">
        <Stat label="per minute" value={props.score.per_minute} />
        <Stat label="accuracy" value={`${Math.round(props.score.accuracy)}%`} />
        <Stat label="wrong" value={props.score.wrong} />
      </div>
      <TimingStats
        items={answerTimes(props.challenge, props.events as MathsEvent[])}
        categories={{ title: "average by operation", order: Object.values(SYMBOLS) }}
      />
    </>
  );
}
