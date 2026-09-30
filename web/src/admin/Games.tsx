import { For, Show, createResource, createSignal } from "solid-js";
import { admin } from "../api/client";
import type { LeaderboardPeriod } from "../api/types";
import { formatDuration, timeAgo } from "../pages/format";
import { boardLabel } from "../profile/GameTile";
import { testName } from "../profile/names";
import { testInfo } from "../tests/catalog";
import Stat from "../ui/Stat";
import Distribution from "./Distribution";

const TYPING_BOARDS = ["time-15", "time-30", "time-60", "words-25", "words-50"];
const PERIODS: [LeaderboardPeriod, string][] = [
  ["all", "all time"],
  ["weekly", "7 days"],
  ["daily", "today"],
];

/** Runs per day over the last 30 days, a bar a day (days without runs are empty). */
function Days(props: { days: { day: string; runs: number }[] }) {
  const DAYS = 30;
  const counts = () => {
    const byDay = new Map(props.days.map((d) => [d.day, d.runs]));
    const today = Date.now();
    return Array.from({ length: DAYS }, (_, i) => {
      const day = new Date(today - (DAYS - 1 - i) * 86_400_000).toISOString().slice(0, 10);
      return { day, runs: byDay.get(day) ?? 0 };
    });
  };
  const max = () => Math.max(1, ...counts().map((d) => d.runs));
  return (
    <div class="flex flex-col gap-1">
      <span class="text-xs text-sub">ranked runs per day · last 30 days</span>
      <div data-testid="admin-days" class="flex h-16 items-end gap-0.5">
        <For each={counts()}>
          {(d) => (
            <span
              class={`flex-1 rounded-sm ${d.runs > 0 ? "bg-main" : "bg-sub-alt"}`}
              style={{ height: `${Math.max(4, (d.runs / max()) * 100)}%` }}
              title={`${d.day}: ${d.runs === 1 ? "1 run" : `${d.runs} runs`}`}
            />
          )}
        </For>
      </div>
    </div>
  );
}

/** Per-game analytics: every game's players and runs, and one game's board in detail. */
export default function Games() {
  const [games] = createResource(() => admin.games());
  const [test, setTest] = createSignal<string>();
  const [key, setKey] = createSignal<string>();
  const [period, setPeriod] = createSignal<LeaderboardPeriod>("all");
  const [board] = createResource(
    () => (test() ? { test: test()!, key: key(), period: period() } : false),
    ({ test, key, period }) => admin.game(test, key, period),
  );
  const format = (value: number) => testInfo(test() ?? "")?.formatScore(Math.round(value * 100) / 100) ?? String(value);

  return (
    <section class="flex flex-col gap-6">
      <table data-testid="admin-games" class="block w-full overflow-x-auto text-left text-sm whitespace-nowrap sm:table sm:text-base">
        <thead class="text-sm text-sub">
          <tr>
            <th class="py-1 font-normal">game</th>
            <th class="py-1 font-normal">players</th>
            <th class="py-1 font-normal">guests</th>
            <th class="py-1 font-normal">runs</th>
            <th class="py-1 font-normal">practice</th>
            <th class="py-1 font-normal">time played</th>
            <th class="py-1 font-normal">last played</th>
          </tr>
        </thead>
        <tbody>
          <For each={games()?.games} fallback={<tr><td class="py-1 text-sub">{games.loading ? "loading…" : "no games played yet"}</td></tr>}>
            {(game) => (
              <tr
                class={`cursor-pointer text-text hover:bg-sub-alt ${test() === game.test ? "bg-sub-alt" : ""}`}
                onClick={() => {
                  setKey(undefined);
                  setTest(game.test);
                }}
              >
                <td class="py-1">{testName(game.test)}</td>
                <td class="py-1">{game.players}</td>
                <td class="py-1 text-sub">{game.guests}</td>
                <td class="py-1">{game.runs}</td>
                <td class="py-1 text-sub">{game.practice_runs}</td>
                <td class="py-1 text-sub">{formatDuration(game.time_ms)}</td>
                <td class="py-1 text-sub">{game.last_at ? timeAgo(game.last_at) : "–"}</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>

      <Show when={test()}>
        {(current) => (
          <section data-testid="admin-game" class="flex flex-col gap-4 rounded-lg bg-sub-alt/50 p-6">
            <div class="flex flex-wrap items-center gap-4">
              <h2 class="text-[1.5rem] text-text">{testName(current())}</h2>
              <Show when={current() === "typing"}>
                <div role="group" aria-label="board" class="flex flex-wrap gap-2 text-sm">
                  <For each={TYPING_BOARDS}>
                    {(b) => (
                      <button
                        type="button"
                        class={`pill !bg-sub-alt ${(key() ?? "time-30") === b ? "active" : ""}`}
                        aria-pressed={(key() ?? "time-30") === b}
                        onClick={() => setKey(b)}
                      >
                        {boardLabel(b)}
                      </button>
                    )}
                  </For>
                </div>
              </Show>
              <div role="group" aria-label="period" class="ml-auto flex rounded-full bg-sub-alt p-1 text-sm">
                <For each={PERIODS}>
                  {([id, label]) => (
                    <button type="button" class={`pill ${period() === id ? "active" : ""}`} aria-pressed={period() === id} onClick={() => setPeriod(id)}>
                      {label}
                    </button>
                  )}
                </For>
              </div>
            </div>
            <Show when={board()} fallback={<p class="text-sub">loading…</p>}>
              {(b) => (
                <>
                  <div class="flex flex-wrap gap-x-12 gap-y-4">
                    <Stat label="players" value={b().players} testId="admin-game-players" />
                    <Stat label="ranked runs" value={b().runs} testId="admin-game-runs" />
                  </div>
                  <div class="flex flex-wrap gap-x-8 gap-y-2">
                    <For each={b().percentiles}>
                      {(entry) => (
                        <div class="flex flex-col">
                          <span class="text-xs text-sub">p{entry.p}</span>
                          <span data-testid={`admin-p${entry.p}`} class="text-main">
                            {format(entry.value)}
                          </span>
                        </div>
                      )}
                    </For>
                  </div>
                  <p class="-mt-2 text-xs text-sub">each player's best on this board; pN: ahead of N% of players</p>
                  <Show when={b().histogram} fallback={<p class="text-sub">no ranked runs on this board in this period</p>}>
                    {(histogram) => <Distribution histogram={histogram()} percentiles={b().percentiles} format={format} />}
                  </Show>
                  <Days days={b().days} />
                </>
              )}
            </Show>
          </section>
        )}
      </Show>
    </section>
  );
}
