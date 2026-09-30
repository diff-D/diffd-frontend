import { A } from "@solidjs/router";
import { For, Show, createSignal, onMount } from "solid-js";
import { errorMessage } from "../api/client";
import type { DuelHistoryResponse, DuelSummary } from "../api/types";
import { formatScore, timeAgo } from "../pages/format";
import { notify } from "../state/notices";
import { testName } from "./names";

const OUTCOMES = {
  win: { text: "won", colour: "text-main" },
  loss: { text: "lost", colour: "text-error" },
  draw: { text: "draw", colour: "text-sub" },
} as const;

/** Finished 1v1s, newest first, a page at a time; `load` fetches a page after `cursor`. */
export default function DuelHistory(props: { load: (cursor?: string) => Promise<DuelHistoryResponse> }) {
  const [duels, setDuels] = createSignal<DuelSummary[]>([]);
  const [cursor, setCursor] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  async function more(from?: string) {
    setLoading(true);
    try {
      const page = await props.load(from);
      setDuels((all) => [...all, ...page.duels]);
      setCursor(page.next_cursor);
    } catch (err) {
      notify(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  onMount(() => void more());

  const score = (test: string, value: number | null) => (value === null ? "left" : formatScore(test, value));

  return (
    <section class="flex flex-col gap-2">
      <h2 class="text-sub">match history</h2>
      <Show when={duels().length > 0} fallback={<p class="text-sub">{loading() ? "loading…" : "no 1v1s yet"}</p>}>
        <table data-testid="duel-history" class="block w-full overflow-x-auto text-left text-sm whitespace-nowrap sm:table sm:text-base">
          <thead class="text-sm text-sub">
            <tr>
              <th class="py-1 font-normal">result</th>
              <th class="py-1 font-normal">test</th>
              <th class="py-1 font-normal">opponent</th>
              <th class="py-1 font-normal">score</th>
              <th class="py-1 font-normal">when</th>
            </tr>
          </thead>
          <tbody>
            <For each={duels()}>
              {(duel) => (
                <tr class="text-text">
                  <td class={`py-1 ${OUTCOMES[duel.outcome].colour}`}>{OUTCOMES[duel.outcome].text}</td>
                  <td class="py-1">
                    {testName(duel.test)}
                    <Show when={duel.mode === "practice"}>
                      <span class="text-sub"> · practice</span>
                    </Show>
                  </td>
                  <td class="py-1">
                    <Show when={duel.opponent} fallback={<span class="text-sub">guest</span>}>
                      {(name) => (
                        <A href={`/u/${encodeURIComponent(name())}`} class="text-text hover:text-main">
                          {name()}
                        </A>
                      )}
                    </Show>
                  </td>
                  <td class="py-1">
                    {score(duel.test, duel.score)} <span class="text-sub">vs {score(duel.test, duel.opponent_score)}</span>
                  </td>
                  <td class="py-1 text-sub">{timeAgo(duel.finished_at)}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
      <Show when={cursor()}>
        {(next) => (
          <div>
            <button type="button" class="btn" disabled={loading()} onClick={() => void more(next())}>
              load more
            </button>
          </div>
        )}
      </Show>
    </section>
  );
}
