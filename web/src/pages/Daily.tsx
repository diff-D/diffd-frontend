import { A } from "@solidjs/router";
import { Match, Show, Switch, createResource, createSignal, onCleanup } from "solid-js";
import { daily, leaderboards } from "../api/client";
import type { DailyInfo } from "../api/types";
import { testDef } from "../tests/registry";
import TestShell from "../tests/shell/TestShell";
import { useTitle } from "../ui/title";

/** The board of a daily challenge. */
export const dailyBoard = (info: DailyInfo) => `/leaderboards/${info.test}?key=${info.settings_key}`;

/** How long until the next challenge (at midnight UTC), to the minute. */
function NextDaily() {
  const [now, setNow] = createSignal(Date.now());
  const timer = window.setInterval(() => setNow(Date.now()), 15_000);
  onCleanup(() => window.clearInterval(timer));
  const left = () => {
    const midnight = new Date(now());
    midnight.setUTCHours(24, 0, 0, 0);
    const minutes = Math.max(1, Math.ceil((midnight.getTime() - now()) / 60_000));
    const hours = Math.floor(minutes / 60);
    return hours > 0 ? `${hours} h ${minutes % 60} min` : `${minutes} min`;
  };
  return <span data-testid="next-daily" class="text-sub">next challenge in {left()}</span>;
}

/** Today's daily challenge: one game for everyone (each with a challenge of their own), one attempt. */
export default function Daily() {
  useTitle(() => "daily challenge");
  // what the visitor had done when the page opened: a finish on this page shows its own result
  const [info] = createResource(() => daily.today());
  return (
    <div class="flex grow flex-col gap-6 pt-6">
      <Switch fallback={<p class="text-center text-sub">loading today's challenge…</p>}>
        <Match when={info.error}>
          <p class="text-center text-error">couldn't load today's challenge</p>
        </Match>
        <Match when={info()}>
          {(today) => {
            const def = testDef(today().test)!;
            // where your score stands on today's board
            const [board] = createResource(
              () => today().played === "finished",
              () => leaderboards.get(today().test, { settings_key: today().settings_key }).catch(() => undefined),
            );
            return (
              <>
                <div class="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
                  <span class="text-main">
                    <i class="fa-solid fa-calendar-day" /> daily challenge
                  </span>
                  <span class="text-sub">{today().date}</span>
                  <Show when={today().streak > 0}>
                    <span class="text-main">
                      <i class="fa-solid fa-fire" /> {today().streak}-day streak
                    </span>
                  </Show>
                  <span class="text-text">
                    <i class={`fa-solid ${def.icon}`} /> {def.name}
                  </span>
                  <A href={dailyBoard(today())} class="btn-text text-sm">
                    <i class="fa-solid fa-trophy" /> today's board
                  </A>
                </div>
                <Switch>
                  <Match when={today().played === "finished"}>
                    <div class="flex flex-col items-center gap-4 pt-12 text-center">
                      <span class="text-sub">your score today</span>
                      <span data-testid="daily-score" class="text-[4rem] leading-none text-main">
                        {def.formatScore(today().score ?? 0)}
                      </span>
                      <Show when={board()?.you}>
                        {(you) => (
                          <A href={dailyBoard(today())} data-testid="daily-rank" class="text-text hover:text-main">
                            #{you().rank} on today's board
                          </A>
                        )}
                      </Show>
                      <NextDaily />
                    </div>
                  </Match>
                  <Match when={today().played === "started"}>
                    <div class="flex flex-col items-center gap-2 pt-12 text-center">
                      <p class="text-sub">you started today's challenge but didn't finish it: one attempt a day</p>
                      <NextDaily />
                    </div>
                  </Match>
                  <Match when={today().played === "none"}>
                    <p class="text-center text-sm text-sub">everyone plays this game today, once: make it count</p>
                    <TestShell def={def} daily />
                  </Match>
                </Switch>
              </>
            );
          }}
        </Match>
      </Switch>
    </div>
  );
}
