import { For, Show, createSignal, onMount } from "solid-js";
import { errorMessage } from "../api/client";
import type { HistoryResponse, RunSummary } from "../api/types";
import { formatScore, timeAgo } from "../pages/format";
import { notify } from "../state/notices";
import { testName } from "./names";

/** Finished runs, newest first, a page at a time; `load` fetches the page after `cursor`. */
export default function RunsTable(props: { load: (cursor?: string) => Promise<HistoryResponse>; title?: string }) {
  const [runs, setRuns] = createSignal<RunSummary[]>([]);
  const [cursor, setCursor] = createSignal<string | null>(null);
  const [loading, setLoading] = createSignal(false);

  async function load(from?: string) {
    setLoading(true);
    try {
      const page = await props.load(from);
      setRuns((list) => [...list, ...page.runs]);
      setCursor(page.next_cursor);
    } catch (err) {
      notify(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }
  onMount(() => void load());

  return (
    <section class="flex flex-col gap-2">
      <h2 class="text-sub">{props.title ?? "runs"}</h2>
      <Show when={runs().length > 0} fallback={<p class="text-sub">{loading() ? "loading…" : "no runs yet"}</p>}>
        <table data-testid="history" class="block w-full overflow-x-auto text-left text-sm whitespace-nowrap sm:table sm:text-base">
          <thead class="text-sm text-sub">
            <tr>
              <th class="py-1 font-normal">test</th>
              <th class="py-1 font-normal">settings</th>
              <th class="py-1 font-normal">score</th>
              <th class="py-1 font-normal">when</th>
            </tr>
          </thead>
          <tbody>
            <For each={runs()}>
              {(run) => (
                <tr class="text-text">
                  <td class="py-1">
                    {testName(run.test)}
                    {run.mode === "practice" ? " · practice" : ""}
                  </td>
                  <td class="py-1 text-sub">{run.settings_key}</td>
                  <td class="py-1 text-main">{formatScore(run.test, run.primary_score)}</td>
                  <td class="py-1 text-sub">{timeAgo(run.finished_at)}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
      <Show when={cursor()}>
        {(next) => (
          <div>
            <button type="button" class="btn" disabled={loading()} onClick={() => void load(next())}>
              load more
            </button>
          </div>
        )}
      </Show>
    </section>
  );
}
