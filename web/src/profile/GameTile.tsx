import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { GameSummary } from "../api/types";
import { formatDuration } from "../pages/format";
import { testInfo } from "../tests/catalog";
import Sparkline from "../ui/Sparkline";

/** Tests where a lower score is better: their trend is flipped so up means better. */
export const lowerIsBetter = (test: string) => test === "reaction";

/** "15 s" or "25 words" for a typing board. */
export const boardLabel = (key: string) => key.replace(/^time-(\d+)$/, "$1 s").replace(/^words-(\d+)$/, "$1 words");

/** A game on a profile: its best, lately and overall, and a link to it in detail. */
export default function GameTile(props: { game: GameSummary; href: string }) {
  const info = () => testInfo(props.game.test)!;
  const best = () => props.game.bests.find((b) => b.settings_key === info().defaultKey);
  const recentAverage = () => {
    const last = props.game.trend.slice(-10);
    return last.length === 0 ? undefined : last.reduce((a, b) => a + b, 0) / last.length;
  };
  const duels = () => props.game.wins + props.game.losses + props.game.draws;
  return (
    <A href={props.href} data-testid={`game-${props.game.test}`} class="card gap-2">
      <div class="flex items-center gap-3">
        <i class={`fa-solid fa-fw ${info().icon} text-main`} />
        <span class="text-text">{info().name}</span>
        <span class="ml-auto">
          <Sparkline values={props.game.trend} flip={lowerIsBetter(props.game.test)} label={`${info().name}: last ${props.game.trend.length} scores`} />
        </span>
      </div>
      <Show
        when={props.game.test === "typing"}
        fallback={
          <span data-testid="game-best" class="text-[2rem] leading-none text-main">
            {best() ? info().formatScore(best()!.primary_score) : "–"}
          </span>
        }
      >
        {/* typing: a best per ranked length, as on its leaderboards */}
        <div data-testid="typing-bests" class="grid grid-cols-5 gap-2 text-center">
          <For each={["time-15", "time-30", "time-60", "words-25", "words-50"]}>
            {(key) => {
              const found = () => props.game.bests.find((b) => b.settings_key === key);
              return (
                <div class="flex flex-col">
                  <span class="text-xs text-sub">{boardLabel(key)}</span>
                  <span class={found() ? "text-main" : "text-sub"}>{found() ? Math.round(found()!.primary_score) : "–"}</span>
                </div>
              );
            }}
          </For>
        </div>
      </Show>
      <span class="mt-auto text-sm text-sub">
        <Show when={recentAverage() !== undefined}>
          avg {Math.min(10, props.game.trend.length)} · <span class="text-text">{info().formatScore(Math.round(recentAverage()! * 100) / 100)}</span>
          <Show when={props.game.test === "typing" && props.game.trend_key}>{(key) => ` (${boardLabel(key())})`}</Show> ·{" "}
        </Show>
        {props.game.runs === 1 ? "1 run" : `${props.game.runs} runs`}
        <Show when={props.game.practice_runs}>{(n) => ` (${n()} practice)`}</Show> · {formatDuration(props.game.time_ms)}
        <Show when={duels() > 0}>
          {" "}
          · 1v1 {props.game.wins}–{props.game.losses}
          <Show when={props.game.draws > 0}>–{props.game.draws}</Show>
        </Show>
      </span>
    </A>
  );
}
