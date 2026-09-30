import { For, createSignal, onCleanup, onMount } from "solid-js";
import { useRemote } from "../shell/remote";
import type { PlayProps } from "../shell/types";
import { LEVELS, LIVES, gridSize, showMs, startLevel } from "./logic";
import type { PatternMemoryChallenge, PatternMemoryEvent, PatternMemorySettings } from "./types";

/** How long a missed pattern stays on screen after a wrong tile, and the pause between levels. */
const WRONG_MS = 1000;
const NEXT_MS = 400;

type Stage = "show" | "pick" | "wrong" | "done";

/** Tiles light up for a moment; pick all of them, in any order. The grid grows with the pattern. */
export default function PatternMemoryPlay(props: PlayProps<PatternMemorySettings, PatternMemoryChallenge>) {
  const t0 = performance.now();
  const events: PatternMemoryEvent[] = [];
  const [level, setLevel] = createSignal(startLevel(props.challenge));
  const [attempt, setAttempt] = createSignal(0);
  const [lives, setLives] = createSignal(LIVES);
  const [stage, setStage] = createSignal<Stage>("show");
  const [picked, setPicked] = createSignal(new Set<number>());
  const [wrongTile, setWrongTile] = createSignal<number | null>(null);
  const timers: number[] = [];

  const later = (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms));
  const pattern = () => new Set(props.challenge.levels[level() - 1][attempt()]);
  const size = () => gridSize(level());

  function show() {
    setPicked(new Set<number>());
    setWrongTile(null);
    setStage("show");
    later(showMs(level()), () => setStage("pick"));
  }

  function tap(tile: number) {
    if (stage() !== "pick" || picked().has(tile)) return;
    events.push({ t_ms: performance.now() - t0, level: level(), attempt: attempt(), tile });
    if (pattern().has(tile)) {
      const next = new Set(picked()).add(tile);
      setPicked(next);
      if (next.size < pattern().size) return;
      props.progress?.(level());
      setStage("done");
      if (level() === LEVELS) return props.finish(events);
      later(NEXT_MS, () => {
        setLevel((n) => n + 1);
        setAttempt(0);
        show();
      });
    } else {
      setWrongTile(tile);
      setStage("wrong");
      setLives((n) => n - 1);
      if (lives() === 0) return later(WRONG_MS, () => props.finish(events));
      later(WRONG_MS, () => {
        setAttempt((n) => n + 1);
        show();
      });
    }
  }

  // the phone shows this level's grid, live while picking
  useRemote(
    props.remote,
    () => ({ kind: "grid", cols: size(), tiles: size() * size(), active: stage() === "pick" }),
    (action) => {
      if (action.type === "tap") tap(action.tile);
    },
  );

  onMount(() => {
    props.started();
    show();
  });
  onCleanup(() => {
    for (const timer of timers) window.clearTimeout(timer);
  });

  /** Lit while shown or picked; after a mistake the missed tiles show too. */
  const colour = (tile: number) => {
    if (tile === wrongTile()) return "bg-error";
    const lit = pattern().has(tile);
    if (picked().has(tile) || (lit && (stage() === "show" || stage() === "done"))) return "bg-main";
    if (lit && stage() === "wrong") return "bg-sub";
    return "bg-sub-alt";
  };

  return (
    <div class="flex flex-col items-center gap-8">
      <div class="flex items-center gap-8 text-sub">
        <span>level {level()}</span>
        <span role="img" aria-label={`${lives()} lives`} class="flex gap-1">
          <For each={Array.from({ length: LIVES }, (_, i) => i)}>
            {(i) => <i class={`fa-solid fa-heart ${i < lives() ? "text-main" : "text-sub"}`} />}
          </For>
        </span>
      </div>
      <div
        data-testid="pattern-grid"
        data-stage={stage()}
        class="grid aspect-square w-[min(24rem,85vw)] gap-2"
        style={{ "grid-template-columns": `repeat(${size()}, minmax(0, 1fr))` }}
      >
        <For each={Array.from({ length: size() * size() }, (_, i) => i)}>
          {(tile) => (
            <button
              type="button"
              tabindex="-1"
              data-tile={tile}
              aria-label={`tile ${tile + 1}`}
              class={`rounded-md transition-colors ${colour(tile)}`}
              onPointerDown={(e) => {
                if (e.button === 0) tap(tile);
              }}
            />
          )}
        </For>
      </div>
    </div>
  );
}
