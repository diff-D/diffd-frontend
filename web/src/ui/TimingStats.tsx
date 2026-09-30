import { For, Show } from "solid-js";
import Stat from "./Stat";
import TimingChart from "./TimingChart";
import { type Timed, averageByCategory, formatMs, summarize } from "./stats";

/**
 * How long each item took: a chart, the 3 fastest and slowest, average, median and standard
 * deviation (how much the times vary around the average), and the
 * average per category when `categories` names them (in display order).
 */
export default function TimingStats(props: { items: Timed[]; categories?: { title: string; order: string[] }; precise?: boolean }) {
  const summary = () => summarize(props.items.map((item) => item.ms));
  const format = (ms: number) => formatMs(ms, props.precise);
  const list = (times: number[]) => times.map(format).join(" · ");
  const byCategory = () => (props.categories ? averageByCategory(props.items, props.categories.order) : []);
  return (
    <Show when={summary()}>
      {(s) => (
        <div data-testid="timing-stats" class="flex flex-col gap-6">
          <TimingChart items={props.items} precise={props.precise} />
          <div class="flex flex-wrap gap-12">
            <Stat label="average" value={format(s().average)} testId="timing-average" />
            <Stat label="median" value={format(s().median)} testId="timing-median" />
            <Stat label="std dev" value={`±${format(s().spread)}`} testId="timing-std-dev" />
            <div class="flex flex-col">
              <span class="text-sub">fastest</span>
              <span data-testid="timing-fastest" class="text-text">
                {list(s().fastest)}
              </span>
              <span class="mt-2 text-sub">slowest</span>
              <span data-testid="timing-slowest" class="text-text">
                {list(s().slowest)}
              </span>
            </div>
            <Show when={byCategory().length > 0}>
              <div class="flex flex-col">
                <span class="text-sub">{props.categories?.title}</span>
                <table data-testid="timing-categories" class="text-text">
                  <tbody>
                    <For each={byCategory()}>
                      {(row) => (
                        <tr>
                          <td class="pr-4 text-main">{row.category}</td>
                          <td class="pr-4">{format(row.average)}</td>
                          <td class="text-sub">×{row.count}</td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>
            </Show>
          </div>
        </div>
      )}
    </Show>
  );
}
