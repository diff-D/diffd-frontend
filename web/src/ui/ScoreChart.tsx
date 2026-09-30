import { For, Show, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { formatDay } from "../pages/format";
import { niceScale, smoothPath } from "./chart";
import { summarize } from "./stats";

const HEIGHT = 200;
const PAD = { left: 44, right: 12, top: 10, bottom: 10 };

/**
 * Scores over time (oldest left) as a smooth line over gridlines, with the average (dashed),
 * the median (solid) and the best marked; pointing at it reads out the nearest score.
 */
export default function ScoreChart(props: {
  scores: { primary_score: number; finished_at: string }[];
  format: (value: number) => string;
  /** Lower scores are better (reaction time): the best is the lowest. */
  lowerIsBetter?: boolean;
}) {
  let box!: HTMLDivElement;
  const [width, setWidth] = createSignal(600);
  onMount(() => {
    setWidth(box.clientWidth || 600);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || 600));
    observer.observe(box);
    onCleanup(() => observer.disconnect());
  });

  const values = () => props.scores.map((s) => s.primary_score);
  const summary = createMemo(() => summarize(values()));
  const scale = createMemo(() => niceScale(Math.max(...values(), 1)));
  const plotWidth = () => Math.max(1, width() - PAD.left - PAD.right);
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (values().length > 1 ? (i / (values().length - 1)) * plotWidth() : plotWidth() / 2);
  const y = (value: number) => PAD.top + plotHeight - (value / scale().top) * plotHeight;
  const ticks = () => Array.from({ length: Math.round(scale().top / scale().step) + 1 }, (_, i) => i * scale().step);
  const bestIndex = () => {
    const v = values();
    const best = props.lowerIsBetter ? Math.min(...v) : Math.max(...v);
    return v.indexOf(best);
  };

  const [hovered, setHovered] = createSignal<number>();
  function onPointerMove(e: PointerEvent) {
    const left = (e.currentTarget as SVGElement).getBoundingClientRect().left;
    const n = values().length;
    const fraction = n > 1 ? (e.clientX - left - PAD.left) / plotWidth() : 0;
    setHovered(Math.min(n - 1, Math.max(0, Math.round(fraction * (n - 1)))));
  }

  return (
    <Show when={props.scores.length > 0 && summary()}>
      {(s) => (
        <div class="flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-sub">
            <span class="flex items-center gap-1">
              <span class="h-0.5 w-4 rounded bg-main" /> score
            </span>
            <span class="flex items-center gap-1">
              <span class="h-0 w-4 border-t border-dashed border-sub" /> average
            </span>
            <span class="flex items-center gap-1">
              <span class="h-0.5 w-4 rounded bg-text" /> median
            </span>
            <span data-testid="score-readout" class="ml-auto text-text">
              <Show when={hovered() !== undefined && props.scores[hovered()!]}>
                {(point) => `${formatDay(point().finished_at)} · ${props.format(point().primary_score)}`}
              </Show>
            </span>
          </div>
          <div ref={box} class="w-full">
            <svg
              data-testid="score-chart"
              width={width()}
              height={HEIGHT}
              viewBox={`0 0 ${width()} ${HEIGHT}`}
              role="img"
              aria-label="scores over time"
              class="block touch-none select-none"
              onPointerMove={onPointerMove}
              onPointerDown={onPointerMove}
              onPointerLeave={() => setHovered(undefined)}
            >
              <For each={ticks()}>
                {(value) => (
                  <>
                    <line x1={PAD.left} x2={PAD.left + plotWidth()} y1={y(value)} y2={y(value)} stroke="var(--sub-alt-color)" stroke-width="1" />
                    <text x={PAD.left - 6} y={y(value)} dy="0.32em" text-anchor="end" font-size="10" fill="var(--sub-color)">
                      {value}
                    </text>
                  </>
                )}
              </For>
              <line x1={PAD.left} x2={PAD.left + plotWidth()} y1={y(s().average)} y2={y(s().average)} stroke="var(--sub-color)" stroke-width="1.5" stroke-dasharray="5 4" />
              <line x1={PAD.left} x2={PAD.left + plotWidth()} y1={y(s().median)} y2={y(s().median)} stroke="var(--text-color)" stroke-width="1" />
              <Show when={hovered() !== undefined}>
                <line x1={x(hovered()!)} x2={x(hovered()!)} y1={PAD.top} y2={PAD.top + plotHeight} stroke="var(--sub-color)" stroke-width="1" stroke-dasharray="3 3" />
              </Show>
              <path
                data-testid="score-line"
                d={smoothPath(values().map((value, i) => ({ x: x(i), y: y(value) })))}
                fill="none"
                stroke="var(--main-color)"
                stroke-width="2"
                stroke-linejoin="round"
                stroke-linecap="round"
              />
              <Show when={values().length <= 40}>
                <For each={values()}>{(value, i) => <circle cx={x(i())} cy={y(value)} r="2.5" fill="var(--main-color)" />}</For>
              </Show>
              {/* the best, ringed */}
              <circle data-testid="score-best" cx={x(bestIndex())} cy={y(values()[bestIndex()])} r="5" fill="none" stroke="var(--main-color)" stroke-width="2" />
              <Show when={hovered() !== undefined}>
                <circle cx={x(hovered()!)} cy={y(values()[hovered()!])} r="4" fill="var(--main-color)" stroke="var(--bg-color)" stroke-width="1.5" />
              </Show>
            </svg>
          </div>
        </div>
      )}
    </Show>
  );
}
