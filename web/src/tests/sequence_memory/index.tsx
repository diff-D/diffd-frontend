import { For, createSignal, onCleanup, onMount } from "solid-js";
import { useRemote } from "../shell/remote";
import type { PlayProps } from "../shell/types";
import { TILE_KEYS, startLevel } from "./logic";
import type { SequenceMemoryChallenge, SequenceMemoryEvent, SequenceMemorySettings } from "./types";

const PAUSE_MS = 800;
const LIT_MS = 450;
const GAP_MS = 150;
const TAP_MS = 150;
const WRONG_MS = 400;

type Lit = { tile: number; kind: "flash" | "tap" | "wrong" };

const LIT_COLOURS: Record<Lit["kind"], string> = { flash: "bg-main", tap: "bg-text", wrong: "bg-error" };

/** Tiles light up one after another; repeat them in order, one more each level. */
export default function SequenceMemoryPlay(props: PlayProps<SequenceMemorySettings, SequenceMemoryChallenge>) {
  const t0 = performance.now();
  const events: SequenceMemoryEvent[] = [];
  const [level, setLevel] = createSignal(startLevel(props.challenge));
  const [lit, setLit] = createSignal<Lit | null>(null);
  const [listening, setListening] = createSignal(false);
  const timers: number[] = [];
  let position = 0;
  let finished = false;

  const later = (ms: number, fn: () => void) => void timers.push(window.setTimeout(fn, ms));

  /** Flashes the first `level` tiles, then waits for the player. */
  function playBack() {
    setListening(false);
    position = 0;
    const n = level();
    for (let i = 0; i < n; i++) {
      const at = PAUSE_MS + i * (LIT_MS + GAP_MS);
      later(at, () => setLit({ tile: props.challenge.sequence[i], kind: "flash" }));
      later(at + LIT_MS, () => setLit(null));
    }
    later(PAUSE_MS + n * (LIT_MS + GAP_MS), () => setListening(true));
  }

  function tap(tile: number) {
    if (!listening() || finished) return;
    events.push({ t_ms: performance.now() - t0, level: level(), tile });
    if (tile !== props.challenge.sequence[position]) {
      finished = true;
      setListening(false);
      setLit({ tile, kind: "wrong" });
      later(WRONG_MS, () => props.finish(events));
      return;
    }
    setLit({ tile, kind: "tap" });
    later(TAP_MS, () => setLit((current) => (current?.kind === "tap" && current.tile === tile ? null : current)));
    position += 1;
    if (position < level()) return;
    props.progress?.(level());
    if (level() === props.challenge.sequence.length) {
      finished = true;
      props.finish(events);
      return;
    }
    setLevel((n) => n + 1);
    playBack();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const tile = TILE_KEYS.indexOf(e.key);
    if (tile < 0) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, [role=dialog]")) return;
    e.preventDefault();
    tap(tile);
  }

  // the phone shows the same 3×3 tiles, live once the sequence has played
  useRemote(
    props.remote,
    () => ({ kind: "grid", cols: 3, tiles: TILE_KEYS.length, active: listening() }),
    (action) => {
      if (action.type === "tap") tap(action.tile);
    },
  );

  onMount(() => {
    window.addEventListener("keydown", onKeyDown);
    props.started();
    playBack();
  });
  onCleanup(() => {
    window.removeEventListener("keydown", onKeyDown);
    for (const timer of timers) window.clearTimeout(timer);
  });

  const colour = (tile: number) => {
    const current = lit();
    return current?.tile === tile ? LIT_COLOURS[current.kind] : "bg-sub-alt";
  };

  return (
    <div class="flex flex-col items-center gap-8">
      <span class="text-sub">level {level()}</span>
      <div data-testid="grid" data-listening={String(listening())} class="grid w-[min(20rem,88vw)] grid-cols-3 gap-3 sm:w-auto sm:gap-4">
        <For each={TILE_KEYS}>
          {(key, i) => (
            <button
              type="button"
              tabindex="-1"
              aria-label={`tile ${key}`}
              class={`relative aspect-square w-full touch-manipulation rounded-lg transition-colors [-webkit-tap-highlight-color:transparent] sm:size-24 ${colour(i())}`}
              onPointerDown={(e) => {
                if (e.button === 0) tap(i());
              }}
            >
              <span class="absolute right-2 bottom-1 text-xs text-sub touch:hidden">{key}</span>
            </button>
          )}
        </For>
      </div>
    </div>
  );
}
