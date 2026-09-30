import { For } from "solid-js";

/** The host's choices for sketch (server: `SketchSettings`): rounds, and time to draw. */
export type SketchSettings = { rounds: number; draw_s: number };
const DEFAULTS: SketchSettings = { rounds: 2, draw_s: 80 };
const ROUNDS = [1, 2, 3, 4, 5];
const DRAW_TIMES = [30, 60, 80, 120, 180];

const read = (value: unknown): SketchSettings => ({ ...DEFAULTS, ...(value as Partial<SketchSettings> | undefined) });

/** The settings in a line, as the lobby shows them. */
export function sketchSummary(value: unknown): string {
  const { rounds, draw_s } = read(value);
  return `${rounds} ${rounds === 1 ? "round" : "rounds"} · ${draw_s} s to draw`;
}

export default function SketchOptions(props: { value: unknown; onChange: (next: SketchSettings) => void }) {
  const current = () => read(props.value);
  const group = (label: string, options: number[], key: keyof SketchSettings, unit = "") => (
    <div class="flex flex-wrap items-center gap-3">
      <span class="w-28 whitespace-nowrap text-sub">{label}</span>
      <div role="group" aria-label={label} class="flex flex-wrap rounded-full bg-bg p-1">
        <For each={options}>
          {(option) => (
            <button
              type="button"
              class={`pill ${current()[key] === option ? "active" : ""}`}
              aria-pressed={current()[key] === option}
              onClick={() => props.onChange({ ...current(), [key]: option })}
            >
              {option}
              {unit}
            </button>
          )}
        </For>
      </div>
    </div>
  );
  return (
    <>
      {group("rounds", ROUNDS, "rounds")}
      {group("time to draw", DRAW_TIMES, "draw_s", " s")}
    </>
  );
}
