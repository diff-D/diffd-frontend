import Stat from "../../ui/Stat";
import type { ResultsProps } from "../shell/types";
import { speedTimeline } from "./logic";
import SpeedChart from "./SpeedChart";
import type { TypingChallenge, TypingEvent, TypingScore, TypingSettings } from "./types";

export default function TypingResults(props: ResultsProps<TypingSettings, TypingChallenge, TypingScore>) {
  const score = () => props.score;
  const timeline = () => speedTimeline(props.challenge, props.events as TypingEvent[], score().duration_s);
  return (
    <>
      <SpeedChart timeline={timeline()} />
      <div class="flex flex-wrap justify-between gap-8">
        <Stat label="raw" value={Math.round(score().raw)} />
        <Stat label="consistency" value={`${Math.round(score().consistency)}%`} />
        <Stat label="characters" value={`${score().correct_chars}/${score().raw_chars}`} />
        <Stat label="time" value={`${score().duration_s}s`} />
      </div>
    </>
  );
}
