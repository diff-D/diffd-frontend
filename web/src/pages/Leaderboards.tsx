import { A, useNavigate, useParams, useSearchParams } from "@solidjs/router";
import { For, Show, createEffect, createResource, createSignal, on } from "solid-js";
import { daily, errorMessage, leaderboards } from "../api/client";
import type { LeaderboardEntry, LeaderboardPeriod } from "../api/types";
import { currentUsername } from "../state/identity";
import { CATALOG, CATEGORIES, testInfo } from "../tests/catalog";
import { timeAgo } from "./format";
import { useTitle } from "../ui/title";
import PlayerName from "../ui/PlayerName";

/** Typing's ranked settings each have a board; every other game has one ranked board. */
const TYPING_KEYS = ["time-15", "time-30", "time-60", "words-25", "words-50"];
const PERIODS: [LeaderboardPeriod, string][] = [
  ["all", "all time"],
  ["weekly", "7 days"],
  ["daily", "today"],
];
const keyLabel = (key: string) => key.replace("time-", "").replace("words-", "") + (key.startsWith("time") ? " s" : " words");

/** The best ranked scores per game, all time, in the last 7 days or today; everyone's or just friends'. */
export default function Leaderboards() {
  const params = useParams<{ test?: string }>();
  // `?key=` opens a particular board (a daily challenge's)
  const [search] = useSearchParams<{ key?: string }>();
  const navigate = useNavigate();
  const test = () => (params.test && testInfo(params.test) ? params.test : "typing");
  const info = () => testInfo(test())!;
  useTitle(() => `${info().name} leaderboard`);
  const [period, setPeriod] = createSignal<LeaderboardPeriod>("all");
  const [key, setKey] = createSignal<string>();
  const [friends, setFriends] = createSignal(false);
  const [entries, setEntries] = createSignal<LeaderboardEntry[]>([]);
  const [cursor, setCursor] = createSignal<string | null>(null);
  const [you, setYou] = createSignal<{ rank: number; primary_score: number }>();
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");

  const settingsKey = () => key() ?? info().defaultKey;
  const [today] = createResource(() => daily.today().catch(() => undefined));

  // a quick switch between boards must not show a slower, older answer
  let latest = 0;
  async function load(from?: string) {
    const request = ++latest;
    setLoading(true);
    setError("");
    try {
      const page = await leaderboards.get(test(), {
        settings_key: settingsKey(),
        period: period(),
        cursor: from,
        friends: friends() && Boolean(currentUsername()),
      });
      if (request !== latest) return;
      setEntries((list) => (from ? [...list, ...page.entries] : page.entries));
      if (!from) setYou(page.you);
      setCursor(page.next_cursor);
    } catch (err) {
      if (request === latest) setError(errorMessage(err));
    } finally {
      if (request === latest) setLoading(false);
    }
  }

  // a new game starts on its default board (or the one the address names)
  createEffect(on([test, () => search.key], () => setKey(search.key || undefined)));
  createEffect(on([test, period, settingsKey, friends, currentUsername], () => void load()));

  const emptyText = () => {
    const who = friends() && currentUsername() ? "none of your friends has" : "nobody has";
    const when = { all: "", weekly: " in the last 7 days", daily: " today" }[period()];
    return `${who} played it${when} yet`;
  };

  return (
    <div class="flex flex-col gap-6 pt-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap items-baseline gap-4">
          <h1 class="text-[2rem] text-text">leaderboards</h1>
          <Show when={today()}>
            {(info) => (
              <A href={`/leaderboards/${info().test}?key=${info().settings_key}`} class="btn-text text-sm !text-main">
                <i class="fa-solid fa-calendar-day" /> today's daily challenge
              </A>
            )}
          </Show>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <div role="group" aria-label="period" class="flex rounded-full bg-sub-alt p-1 text-sm">
            <For each={PERIODS}>
              {([id, label]) => (
                <button type="button" class={`pill ${period() === id ? "active" : ""}`} aria-pressed={period() === id} onClick={() => setPeriod(id)}>
                  {label}
                </button>
              )}
            </For>
          </div>
          <Show when={currentUsername()}>
            <button
              type="button"
              class={`pill !bg-sub-alt text-sm ${friends() ? "active" : ""}`}
              aria-pressed={friends()}
              onClick={() => setFriends(!friends())}
            >
              <i class="fa-solid fa-user-group" /> friends
            </button>
          </Show>
        </div>
      </div>

      <nav aria-label="games" class="flex flex-col gap-2 text-sm">
        <For each={CATEGORIES}>
          {(category) => (
            <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
              <span class="text-sub sm:w-20">{category.name}</span>
              <div class="flex flex-wrap gap-2">
              <For each={CATALOG.filter((game) => game.category === category.id)}>
                {(game) => (
                  <button
                    type="button"
                    class={`pill !bg-sub-alt ${game.id === test() ? "active" : ""}`}
                    aria-pressed={game.id === test()}
                    onClick={() => navigate(`/leaderboards/${game.id}`)}
                  >
                    {game.name}
                  </button>
                )}
              </For>
              </div>
            </div>
          )}
        </For>
      </nav>

      <Show when={test() === "typing"}>
        <div role="group" aria-label="typing board" class="flex flex-wrap gap-2 text-sm">
          <For each={TYPING_KEYS}>
            {(k) => (
              <button type="button" class={`pill !bg-sub-alt ${settingsKey() === k ? "active" : ""}`} aria-pressed={settingsKey() === k} onClick={() => setKey(k)}>
                {keyLabel(k)}
              </button>
            )}
          </For>
        </div>
      </Show>

      <section class="flex flex-col gap-2">
        <div class="flex flex-wrap items-baseline gap-3">
          <i class={`fa-solid ${info().icon} text-main`} />
          <h2 class="text-[1.25rem] text-text">{info().name}</h2>
          <Show when={settingsKey().startsWith("daily-")}>
            <span data-testid="daily-board" class="text-sm text-main">
              daily challenge · {settingsKey().slice("daily-".length)}
            </span>
          </Show>
          <A href={`/t/${test()}`} class="btn-text text-sm">
            play
          </A>
        </div>
        <Show when={error()}>
          <p class="text-error">{error()}</p>
        </Show>
        <Show when={you()}>
          {(mine) => (
            <p data-testid="your-rank" class="text-sm text-sub">
              you · <span class="text-main">#{mine().rank}</span> · {info().formatScore(mine().primary_score)}
            </p>
          )}
        </Show>
        <Show
          when={entries().length > 0}
          fallback={<p class="py-8 text-center text-sub">{loading() ? "loading…" : emptyText()}</p>}
        >
          <table data-testid="leaderboard" class="w-full table-fixed text-left text-sm sm:text-base">
            <thead class="text-sm text-sub">
              <tr>
                <th class="w-10 py-1 font-normal">#</th>
                <th class="py-1 font-normal">player</th>
                <th class="w-32 py-1 text-right font-normal sm:w-40">{info().primaryLabel}</th>
                <th class="hidden w-28 py-1 text-right font-normal sm:table-cell">when</th>
              </tr>
            </thead>
            <tbody>
              <For each={entries()}>
                {(entry) => (
                  <tr class={entry.username === currentUsername() ? "bg-sub-alt" : ""}>
                    <td class={`py-1 ${entry.rank <= 3 ? "text-main" : "text-sub"}`}>{entry.rank}</td>
                    <td class="truncate py-1">
                      <A href={`/u/${encodeURIComponent(entry.username)}`} class="text-text hover:text-main">
                        <PlayerName name={entry.username} tag={entry.org_tag} />
                      </A>
                    </td>
                    <td class="py-1 text-right text-main">{info().formatScore(entry.primary_score)}</td>
                    <td class="hidden py-1 text-right text-sub sm:table-cell">{timeAgo(entry.finished_at)}</td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </Show>
        <Show when={cursor()}>
          {(next) => (
            <button type="button" class="btn self-center" disabled={loading()} onClick={() => void load(next())}>
              load more
            </button>
          )}
        </Show>
      </section>
    </div>
  );
}
