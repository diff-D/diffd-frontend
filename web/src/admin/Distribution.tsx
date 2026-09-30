import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { niceScale } from "../ui/chart";

const HEIGHT = 180;
const PAD = { left: 32, right: 12, top: 18, bottom: 22 };
/** The percentiles marked on the chart (the rest are listed beside it). */
const MARKED = [25, 50, 75, 90];

/**
 * How players' bests spread: a bar per equal slice of the scores (ascending), with the
 * marked percentiles as lines at their scores; pointing at a bar reads it out.
 */
export default function Distribution(props: {
  histogram: { min: number; max: number; counts: number[] };
  percentiles: { p: number; value: number }[];
  format: (value: number) => string;
}) {
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
  const scale = () => niceScale(Math.max(...props.histogram.counts, 1), 3);
  const slot = () => plotWidth() / props.histogram.counts.length;
  const span = () => props.histogram.max - props.histogram.min;
  const sliceWidth = () => span() / props.histogram.counts.length;
  const x = (value: number) => PAD.left + (span() > 0 ? ((value - props.histogram.min) / span()) * plotWidth() : plotWidth() / 2);
  const y = (count: number) => PAD.top + plotHeight - (count / scale().top) * plotHeight;
  const ticks = () => Array.from({ length: Math.round(scale().top / scale().step) + 1 }, (_, i) => i * scale().step);
  const [hovered, setHovered] = createSignal<number>();

  return (
    <div class="flex flex-col gap-2">
      <div class="flex flex-wrap items-center gap-x-4 text-xs text-sub">
        <span>players' bests</span>
        <span data-testid="distribution-readout" class="ml-auto text-text">
          <Show when={hovered() !== undefined}>
            {(() => {
              const i = hovered()!;
              const from = props.histogram.min + i * sliceWidth();
              const count = props.histogram.counts[i];
              return `${props.format(from)}–${props.format(from + sliceWidth())} · ${count === 1 ? "1 player" : `${count} players`}`;
            })()}
          </Show>
        </span>
      </div>
      <div ref={box} class="w-full">
        <svg
          data-testid="distribution"
          width={width()}
          height={HEIGHT}
          viewBox={`0 0 ${width()} ${HEIGHT}`}
          role="img"
          aria-label="how players' bests spread"
          class="block"
          onPointerLeave={() => setHovered(undefined)}
        >
          <For each={ticks()}>
            {(count) => (
              <>
                <line x1={PAD.left} x2={PAD.left + plotWidth()} y1={y(count)} y2={y(count)} stroke="var(--sub-alt-color)" stroke-width="1" />
                <text x={PAD.left - 6} y={y(count)} dy="0.32em" text-anchor="end" font-size="10" fill="var(--sub-color)">
                  {count}
                </text>
              </>
            )}
          </For>
          <For each={props.histogram.counts}>
            {(count, i) => (
              <rect
                x={PAD.left + i() * slot() + 1}
                width={Math.max(1, slot() - 2)}
                y={y(count)}
                height={PAD.top + plotHeight - y(count)}
                rx="2"
                fill="var(--main-color)"
                opacity={hovered() === undefined || hovered() === i() ? 1 : 0.5}
                onPointerEnter={() => setHovered(i())}
              />
            )}
          </For>
          <For each={props.percentiles.filter((entry) => MARKED.includes(entry.p))}>
            {(entry) => (
              <g data-testid={`marker-p${entry.p}`}>
                <line x1={x(entry.value)} x2={x(entry.value)} y1={PAD.top} y2={PAD.top + plotHeight} stroke="var(--text-color)" stroke-width="1" stroke-dasharray="3 3" />
                <text x={x(entry.value)} y={PAD.top - 6} text-anchor="middle" font-size="10" fill="var(--text-color)">
                  p{entry.p}
                </text>
              </g>
            )}
          </For>
          <text x={PAD.left} y={HEIGHT - 6} font-size="10" fill="var(--sub-color)">
            {props.format(props.histogram.min)}
          </text>
          <text x={PAD.left + plotWidth()} y={HEIGHT - 6} text-anchor="end" font-size="10" fill="var(--sub-color)">
            {props.format(props.histogram.max)}
          </text>
        </svg>
      </div>
    </div>
  );
}
