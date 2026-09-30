import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { niceScale, smoothPath } from "../../ui/chart";
import type { SecondStats } from "./logic";

const HEIGHT = 200;
/** Room for the axis labels: left (wpm), right (errors), bottom (seconds). */
const PAD = { left: 36, right: 28, top: 10, bottom: 22 };

/** How often to label the seconds so that about 10 labels fit. */
const secondStep = (seconds: number) => [1, 2, 5, 10, 15, 30, 60].find((s) => seconds / s <= 10) ?? 120;

/**
 * The run second by second: the speed so far (wpm) and each second's raw speed as smooth
 * lines, a red × for each second with wrong keys (its count on the right axis), gridlines,
 * and the numbers of whichever second the pointer is over.
 */
export default function SpeedChart(props: { timeline: SecondStats[] }) {
  let box!: HTMLDivElement;
  const [width, setWidth] = createSignal(600);
  onMount(() => {
    setWidth(box.clientWidth || 600);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || 600));
    observer.observe(box);
    onCleanup(() => observer.disconnect());
  });

  const plotWidth = () => Math.max(1, width() - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const seconds = () => props.timeline.length;
  const speedScale = createMemo(() => niceScale(Math.max(...props.timeline.flatMap((s) => [s.wpm, s.raw]), 1)));
  const errorScale = createMemo(() => niceScale(Math.max(...props.timeline.map((s) => s.errors), 1), 2));

  // second n sits at n - 1 across (the first second on the left edge)
  const x = (second: number) => PAD.left + (seconds() > 1 ? ((second - 1) / (seconds() - 1)) * plotWidth() : plotWidth() / 2);
  const ySpeed = (value: number) => PAD.top + plotHeight - (value / speedScale().top) * plotHeight;
  const yErrors = (count: number) => PAD.top + plotHeight - (count / errorScale().top) * plotHeight;

  const line = (value: (s: SecondStats) => number) => smoothPath(props.timeline.map((s) => ({ x: x(s.second), y: ySpeed(value(s)) })));
  const speedTicks = () => {
    const { step, top } = speedScale();
    return Array.from({ length: top / step + 1 }, (_, i) => i * step);
  };
  const errorTicks = () => {
    const { step, top } = errorScale();
    return Array.from({ length: top / step }, (_, i) => (i + 1) * step);
  };
  const secondTicks = () => props.timeline.filter((s) => s.second === 1 || s.second % secondStep(seconds()) === 0).map((s) => s.second);

  // the second under the pointer
  const [hovered, setHovered] = createSignal<SecondStats>();
  function onPointerMove(e: PointerEvent) {
    const left = (e.currentTarget as SVGElement).getBoundingClientRect().left;
    const fraction = seconds() > 1 ? (e.clientX - left - PAD.left) / plotWidth() : 0;
    const index = Math.min(seconds() - 1, Math.max(0, Math.round(fraction * (seconds() - 1))));
    setHovered(props.timeline[index]);
  }

  return (
    <Show when={seconds() > 0}>
      <div class="flex flex-col gap-2">
        <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sub">
          <span class="flex items-center gap-1">
            <span class="h-0.5 w-4 rounded bg-main" /> wpm
          </span>
          <span class="flex items-center gap-1">
            <span class="h-0.5 w-4 rounded bg-sub" /> raw
          </span>
          <span class="flex items-center gap-1">
            <span class="text-error">×</span> errors
          </span>
          <span data-testid="chart-readout" class="ml-auto text-text">
            <Show when={hovered()} fallback={<span class="text-sub">point at the chart for a second's numbers</span>}>
              {(s) => (
                <>
                  {s().second}s · <span class="text-main">{s().wpm} wpm</span> · {s().raw} raw
                  <Show when={s().errors > 0}>
                    {" "}
                    · <span class="text-error">{s().errors === 1 ? "1 error" : `${s().errors} errors`}</span>
                  </Show>
                </>
              )}
            </Show>
          </span>
        </div>
        <div ref={box} class="w-full">
          <svg
            data-testid="speed-chart"
            width={width()}
            height={HEIGHT}
            viewBox={`0 0 ${width()} ${HEIGHT}`}
            role="img"
            aria-label="speed and errors per second"
            class="block touch-none select-none"
            onPointerMove={onPointerMove}
            onPointerDown={onPointerMove}
            onPointerLeave={() => setHovered(undefined)}
          >
            {/* gridlines and the speed axis */}
            <For each={speedTicks()}>
              {(value) => (
                <>
                  <line x1={PAD.left} x2={PAD.left + plotWidth()} y1={ySpeed(value)} y2={ySpeed(value)} stroke="var(--sub-alt-color)" stroke-width="1" />
                  <text x={PAD.left - 6} y={ySpeed(value)} dy="0.32em" text-anchor="end" font-size="10" fill="var(--sub-color)">
                    {value}
                  </text>
                </>
              )}
            </For>
            <For each={secondTicks()}>
              {(second) => (
                <>
                  <line x1={x(second)} x2={x(second)} y1={PAD.top} y2={PAD.top + plotHeight} stroke="var(--sub-alt-color)" stroke-width="1" />
                  <text x={x(second)} y={HEIGHT - 6} text-anchor="middle" font-size="10" fill="var(--sub-color)">
                    {second}
                  </text>
                </>
              )}
            </For>
            {/* the errors axis, on the right */}
            <For each={errorTicks()}>
              {(count) => (
                <text x={PAD.left + plotWidth() + 6} y={yErrors(count)} dy="0.32em" font-size="10" fill="var(--error-color)">
                  {count}
                </text>
              )}
            </For>

            <Show when={hovered()}>
              {(s) => <line x1={x(s().second)} x2={x(s().second)} y1={PAD.top} y2={PAD.top + plotHeight} stroke="var(--sub-color)" stroke-width="1" stroke-dasharray="3 3" />}
            </Show>

            <path data-testid="raw-line" d={line((s) => s.raw)} fill="none" stroke="var(--sub-color)" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" />
            <path data-testid="wpm-line" d={line((s) => s.wpm)} fill="none" stroke="var(--main-color)" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round" />
            <Show when={seconds() === 1}>
              <circle cx={x(1)} cy={ySpeed(props.timeline[0].wpm)} r="3" fill="var(--main-color)" />
            </Show>
            <For each={props.timeline.filter((s) => s.errors > 0)}>
              {(s) => (
                <g data-testid="error-mark" stroke="var(--error-color)" stroke-width="2" stroke-linecap="round">
                  <line x1={x(s.second) - 3.5} x2={x(s.second) + 3.5} y1={yErrors(s.errors) - 3.5} y2={yErrors(s.errors) + 3.5} />
                  <line x1={x(s.second) - 3.5} x2={x(s.second) + 3.5} y1={yErrors(s.errors) + 3.5} y2={yErrors(s.errors) - 3.5} />
                </g>
              )}
            </For>
            <Show when={hovered()}>
              {(s) => <circle cx={x(s().second)} cy={ySpeed(s().wpm)} r="3.5" fill="var(--main-color)" stroke="var(--bg-color)" stroke-width="1.5" />}
            </Show>
          </svg>
        </div>
      </div>
    </Show>
  );
}
