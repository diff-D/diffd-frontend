import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { niceScale } from "./chart";
import { type Timed, formatMs, summarize } from "./stats";

const HEIGHT = 180;
/** Room for the time axis on the left. */
const PAD = { left: 40, right: 8, top: 8, bottom: 8 };

/**
 * A bar per item, its height the time it took, over gridlines; the dashed line is the
 * average, the solid one the median, and the faint band a standard deviation either side
 * of the average. Pointing at a bar reads it out.
 */
export default function TimingChart(props: { items: Timed[]; precise?: boolean }) {
  let box!: HTMLDivElement;
  const [width, setWidth] = createSignal(600);
  onMount(() => {
    setWidth(box.clientWidth || 600);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || 600));
    observer.observe(box);
    onCleanup(() => observer.disconnect());
  });

  const summary = createMemo(() => summarize(props.items.map((item) => item.ms)));
  const scale = createMemo(() => {
    // whole seconds on the axis, or whole milliseconds for quick things (reactions)
    const max = Math.max(...props.items.map((item) => item.ms), 1);
    const inSeconds = !props.precise || max >= 1000;
    const unit = inSeconds ? 1000 : 1;
    const { step, top } = niceScale(max / unit);
    return { step: step * unit, top: top * unit };
  });
  const format = (ms: number) => formatMs(ms, props.precise);
  const plotWidth = () => Math.max(1, width() - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const y = (ms: number) => PAD.top + plotHeight - (ms / scale().top) * plotHeight;
  const slot = () => plotWidth() / props.items.length;
  const ticks = () => Array.from({ length: Math.round(scale().top / scale().step) + 1 }, (_, i) => i * scale().step);

  const [hovered, setHovered] = createSignal<Timed>();

  return (
    <Show when={props.items.length > 0 && summary()}>
      {(s) => (
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sub">
            <span class="flex items-center gap-1">
              <span class="h-0 w-4 border-t border-dashed border-sub" /> average
            </span>
            <span class="flex items-center gap-1">
              <span class="h-0.5 w-4 rounded bg-text" /> median
            </span>
            <span class="flex items-center gap-1">
              <span class="h-2 w-4 rounded-sm bg-sub opacity-25" /> ±1 std dev
            </span>
            <span data-testid="timing-readout" class="ml-auto text-text">
              <Show when={hovered()}>{(item) => `${item().label} · ${format(item().ms)}`}</Show>
            </span>
          </div>
          <div ref={box} class="w-full">
            <svg
              data-testid="timing-chart"
              width={width()}
              height={HEIGHT}
              viewBox={`0 0 ${width()} ${HEIGHT}`}
              role="img"
              aria-label="time per item"
              class="block"
              onPointerLeave={() => setHovered(undefined)}
            >
              <For each={ticks()}>
                {(ms) => (
                  <>
                    <line x1={PAD.left} x2={PAD.left + plotWidth()} y1={y(ms)} y2={y(ms)} stroke="var(--sub-alt-color)" stroke-width="1" />
                    <text x={PAD.left - 6} y={y(ms)} dy="0.32em" text-anchor="end" font-size="10" fill="var(--sub-color)">
                      {ms === 0 ? "0" : format(ms)}
                    </text>
                  </>
                )}
              </For>
              {/* a standard deviation either side of the average */}
              <path
                data-testid="timing-spread"
                d={`M${PAD.left},${y(Math.min(scale().top, s().average + s().spread))} H${PAD.left + plotWidth()} V${y(Math.max(0, s().average - s().spread))} H${PAD.left} Z`}
                fill="var(--sub-color)"
                opacity="0.12"
              />
              <For each={props.items}>
                {(item, i) => (
                  <rect
                    x={PAD.left + i() * slot() + slot() * 0.15}
                    width={Math.max(1, slot() * 0.7)}
                    y={y(item.ms)}
                    height={PAD.top + plotHeight - y(item.ms)}
                    rx={Math.min(3, slot() * 0.1)}
                    fill="var(--main-color)"
                    opacity={hovered() && hovered() !== item ? 0.5 : 1}
                    onPointerEnter={() => setHovered(item)}
                  >
                    <title>
                      {item.label}: {format(item.ms)}
                    </title>
                  </rect>
                )}
              </For>
              <line
                data-testid="timing-average-line"
                x1={PAD.left}
                x2={PAD.left + plotWidth()}
                y1={y(s().average)}
                y2={y(s().average)}
                stroke="var(--sub-color)"
                stroke-width="1.5"
                stroke-dasharray="5 4"
              />
              <line
                data-testid="timing-median-line"
                x1={PAD.left}
                x2={PAD.left + plotWidth()}
                y1={y(s().median)}
                y2={y(s().median)}
                stroke="var(--text-color)"
                stroke-width="1.5"
              />
            </svg>
          </div>
        </div>
      )}
    </Show>
  );
}
