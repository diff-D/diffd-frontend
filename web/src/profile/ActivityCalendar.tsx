import { For, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { formatDay } from "../pages/format";
import { type CalendarDay, calendarDays } from "./calendar";

/** The smallest and largest square, and the gap between squares. */
const MIN_CELL = 11;
const MAX_CELL = 22;
const GAP = 3;
const MAX_WEEKS = 53;
/** A shade per level: none, then the theme's main colour ever stronger. */
const OPACITY = [1, 0.3, 0.5, 0.75, 1];

/**
 * Runs per day over the last year, a square a day, darker for busier days, filling the
 * width (a narrow screen shows the latest weeks that fit); pointing at a day reads it out.
 */
export default function ActivityCalendar(props: { activity: { day: string; runs: number }[] }) {
  let box!: HTMLDivElement;
  const [width, setWidth] = createSignal(MAX_WEEKS * (MIN_CELL + GAP));
  onMount(() => {
    setWidth(box.clientWidth || width());
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width || width()));
    observer.observe(box);
    onCleanup(() => observer.disconnect());
  });
  const weeks = () => Math.max(4, Math.min(MAX_WEEKS, Math.floor((width() + GAP) / (MIN_CELL + GAP))));
  // squares grow to fill the width (up to a size)
  const cell = () => Math.min(MAX_CELL, (width() + GAP) / weeks() - GAP);
  const today = new Date().toISOString().slice(0, 10);
  const days = createMemo(() => calendarDays(props.activity, today, weeks()));
  const total = () => props.activity.reduce((sum, a) => sum + a.runs, 0);
  const [hovered, setHovered] = createSignal<CalendarDay>();

  return (
    <section class="flex flex-col gap-2">
      <div class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <h2 class="text-sub">activity</h2>
        <span data-testid="activity-readout" class="text-sub">
          {hovered()
            ? `${hovered()!.runs === 1 ? "1 run" : `${hovered()!.runs} runs`} · ${formatDay(`${hovered()!.day}T12:00:00Z`)}`
            : `${total() === 1 ? "1 run" : `${total()} runs`} in the last year`}
        </span>
      </div>
      <div ref={box} class="w-full">
        <svg
          data-testid="activity-calendar"
          width={weeks() * (cell() + GAP) - GAP}
          height={7 * (cell() + GAP) - GAP}
          role="img"
          aria-label="runs per day"
          class="block"
          onPointerLeave={() => setHovered(undefined)}
        >
          <For each={days()}>
            {(day) => (
              <rect
                data-day={day.day}
                data-level={day.level}
                x={day.week * (cell() + GAP)}
                y={day.weekday * (cell() + GAP)}
                width={cell()}
                height={cell()}
                rx="2"
                fill={day.level === 0 ? "var(--sub-alt-color)" : "var(--main-color)"}
                opacity={OPACITY[day.level]}
                onPointerEnter={() => setHovered(day)}
              />
            )}
          </For>
        </svg>
      </div>
    </section>
  );
}
