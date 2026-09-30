import { A } from "@solidjs/router";
import { For, Show } from "solid-js";
import type { ProfileSummary, RecentRun } from "../api/types";
import { formatDuration, formatScore, timeAgo } from "../pages/format";
import { CATALOG, CATEGORIES } from "../tests/catalog";
import Stat from "../ui/Stat";
import ActivityCalendar from "./ActivityCalendar";
import GameTile from "./GameTile";
import { testName } from "./names";

const OUTCOMES = {
  win: { text: "won", colour: "text-main" },
  loss: { text: "lost", colour: "text-error" },
  draw: { text: "draw", colour: "text-sub" },
} as const;

/** One of the latest runs: the game, its score, and a 1v1's result and opponent. */
function RecentLine(props: { run: RecentRun }) {
  return (
    <li class="flex flex-wrap items-baseline gap-x-3 text-sm sm:text-base">
      <span class="text-text">{testName(props.run.test)}</span>
      <span class="text-main">{formatScore(props.run.test, props.run.primary_score)}</span>
      <Show when={props.run.mode === "practice"}>
        <span class="text-sub">practice</span>
      </Show>
      <Show when={props.run.settings_key.startsWith("daily-")}>
        <span class="text-sub">daily</span>
      </Show>
      <Show when={props.run.duel}>
        {(duel) => (
          <span class={OUTCOMES[duel().outcome].colour}>
            1v1 {OUTCOMES[duel().outcome].text}
            <span class="text-sub">
              {" "}
              vs{" "}
              <Show when={duel().opponent} fallback="guest">
                {(name) => (
                  <A href={`/u/${encodeURIComponent(name())}`} class="text-text hover:text-main">
                    {name()}
                  </A>
                )}
              </Show>
            </span>
          </span>
        )}
      </Show>
      <span class="ml-auto text-sm text-sub">{timeAgo(props.run.finished_at)}</span>
    </li>
  );
}

/**
 * A profile at a glance, the same for your own and anyone's: totals, the activity calendar,
 * a tile per game played (by category) and the latest runs. `base` is where the page lives
 * (a game's detail is `base/test`, all runs `base/history`).
 */
export default function ProfileView(props: { summary: ProfileSummary; base: string }) {
  const totals = () => props.summary.totals;
  const duels = () => totals().wins + totals().losses + totals().draws;
  // one grid for every game played, by category (home page order), then most played
  const categoryOf = (test: string) => CATEGORIES.findIndex((c) => c.id === CATALOG.find((info) => info.id === test)?.category);
  const played = () =>
    props.summary.games.filter((game) => game.runs > 0).sort((a, b) => categoryOf(a.test) - categoryOf(b.test) || b.runs - a.runs);

  return (
    <div class="flex flex-col gap-10">
      <div data-testid="profile-totals" class="grid grid-cols-3 gap-x-8 gap-y-4 sm:grid-cols-6">
        <Stat label="runs" value={totals().runs} testId="total-runs" />
        <Stat label="time played" value={formatDuration(totals().time_ms)} testId="total-time" />
        <Stat label="games played" value={`${totals().games}/${CATALOG.length}`} testId="total-games" />
        <Stat
          label="1v1"
          value={duels() === 0 ? "–" : `${totals().wins}·${totals().losses}·${totals().draws}`}
          testId="total-record"
        />
        <Show when={duels() > 0}>
          <Stat label="win rate" value={`${Math.round((totals().wins / duels()) * 100)}%`} testId="total-win-rate" />
        </Show>
        <Show when={totals().streak > 0}>
          <Stat label="streak" value={`${totals().streak}d`} testId="total-streak" />
        </Show>
      </div>

      <ActivityCalendar activity={props.summary.activity} />

      <Show
        when={props.summary.games.some((game) => game.runs > 0)}
        fallback={<p class="text-sub">no games played yet</p>}
      >
        <section class="flex flex-col gap-3">
          <h2 class="text-sub">games</h2>
          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <For each={played()}>{(game) => <GameTile game={game} href={`${props.base}/${game.test}`} />}</For>
          </div>
        </section>
      </Show>

      <section class="flex flex-col gap-2">
        <div class="flex items-baseline justify-between">
          <h2 class="text-sub">recent</h2>
          <A href={`${props.base}/history`} class="btn-text text-sm">
            all runs and 1v1s
          </A>
        </div>
        <Show when={props.summary.recent.length > 0} fallback={<p class="text-sm text-sub">no finished runs</p>}>
          <ul data-testid="recent" class="flex flex-col gap-1">
            <For each={props.summary.recent}>{(run) => <RecentLine run={run} />}</For>
          </ul>
        </Show>
      </section>
    </div>
  );
}
