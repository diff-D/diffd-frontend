import { For, Show } from "solid-js";
import Stat from "../../ui/Stat";
import TimingStats from "../../ui/TimingStats";
import type { ResultsProps } from "../shell/types";
import { teaWords } from "./dictionary";
import { type TeaAnswer, examples, scoreTea } from "./logic";
import type { TeaChallenge, TeaEvent, TeaScore, TeaSettings } from "./types";

/** The words played (the longest stands out), the misses, and how long each answer took. */
export default function TeaResults(props: ResultsProps<TeaSettings, TeaChallenge, TeaScore>) {
  const rules = () => props.challenge.rules;
  const longest = () => props.score.words.reduce((best, word) => ([...word].length > [...best].length ? word : best), "");
  const average = () => {
    const lengths = props.score.words.map((word) => [...word].length);
    return lengths.length ? (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1) : "–";
  };
  const answered = () => {
    const words = teaWords();
    const found: TeaAnswer[] = [];
    scoreTea(props.challenge, props.events as TeaEvent[], (word) => words.has(word), found);
    return found;
  };
  /** Black, green and blue: time from each group to its word (red and yellow are rounds). */
  const answers = () => (rules().kind === "rounds" ? [] : answered().map((answer) => ({ ms: answer.ms, label: answer.word })));
  /** The groups that came up: every round, or those answered, skipped or missed. */
  const shown = () => {
    const r = rules();
    if (r.kind === "rounds") return r.rounds;
    return Math.min(props.challenge.groups.length, props.score.points + props.score.skipped + props.score.missed);
  };
  /** Each group that came up, your words for it, and what would also have worked. */
  const rows = () => {
    const words = teaWords();
    const scattered = rules().kind === "race" && (rules() as { scattered: boolean }).scattered;
    const red = rules().kind === "rounds" && (rules() as { count: string }).count === "longest";
    return props.challenge.groups.slice(0, shown()).map((group, round) => ({
      group: scattered ? [...group].join(" · ") : group,
      yours: answered()
        .filter((answer) => answer.round === round)
        .map((answer) => answer.word),
      other: examples(words, group, scattered, red ? "long" : "short", red ? 1 : 2),
    }));
  };

  return (
    <>
      <div class="flex flex-wrap gap-12">
        <Stat label="longest" value={longest() || "–"} />
        <Stat label="average length" value={average()} />
        <Stat label="not counted" value={props.score.wrong} />
        <Show when={rules().kind === "race"}>
          <Stat label="skipped" value={props.score.skipped} />
        </Show>
      </div>
      <Show when={answers().length > 0}>
        <TimingStats items={answers()} />
      </Show>
      <ul data-testid="tea-played" class="flex flex-wrap gap-2">
        <For each={props.score.words}>
          {(word) => <li class={`rounded bg-sub-alt px-2 py-1 ${word === longest() ? "text-main" : "text-text"}`}>{word}</li>}
        </For>
      </ul>
      <Show when={rows().length > 0}>
        <table data-testid="tea-groups" class="block w-full overflow-x-auto text-left text-sm whitespace-nowrap sm:table">
          <thead class="text-sub">
            <tr>
              <th class="py-1 pr-6 font-normal">letters</th>
              <th class="py-1 pr-6 font-normal">yours</th>
              <th class="py-1 font-normal">{rules().kind === "rounds" && (rules() as { count: string }).count === "longest" ? "longest possible" : "also worked"}</th>
            </tr>
          </thead>
          <tbody>
            <For each={rows()}>
              {(row) => (
                <tr>
                  <td class="py-1 pr-6 tracking-[0.15em] text-main">{row.group}</td>
                  <td class="py-1 pr-6 text-text">{row.yours.join(", ") || <span class="text-error">–</span>}</td>
                  <td class="py-1 text-sub">{row.other.join(", ")}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </>
  );
}
