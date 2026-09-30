import { For, createSignal, onCleanup, onMount } from "solid-js";
import { Bump } from "../shell/feedback";
import { useRemote } from "../shell/remote";
import type { PlayProps } from "../shell/types";
import { livesOf } from "./logic";
import type { VerbalAnswer, VerbalMemoryChallenge, VerbalMemoryEvent, VerbalMemorySettings } from "./types";

/** s/n by name, or z/x side by side under the left hand, in the buttons' order. */
const KEYS: Record<string, VerbalAnswer | undefined> = { s: "seen", n: "new", z: "seen", x: "new" };
const WRONG_MS = 300;

/** One word at a time: seen it before in this run, or new? Losing the last life (three in ranked) ends it. */
export default function VerbalMemoryPlay(props: PlayProps<VerbalMemorySettings, VerbalMemoryChallenge>) {
  const t0 = performance.now();
  const events: VerbalMemoryEvent[] = [];
  const shown = new Set<string>();
  const [index, setIndex] = createSignal(0);
  const [lives, setLives] = createSignal(livesOf(props.challenge));
  const [score, setScore] = createSignal(0);
  const [wrong, setWrong] = createSignal(false);
  let flash: number | undefined;
  let finished = false;

  const word = () => props.challenge.words[index()];

  function answer(given: VerbalAnswer) {
    if (finished) return;
    const current = word();
    events.push({ t_ms: performance.now() - t0, index: index(), answer: given });
    if ((given === "seen") === shown.has(current)) {
      setScore((n) => n + 1);
      props.progress?.(score());
    } else {
      setLives((n) => n - 1);
      setWrong(true);
      window.clearTimeout(flash);
      flash = window.setTimeout(() => setWrong(false), WRONG_MS);
    }
    shown.add(current);
    if (lives() === 0 || index() + 1 === props.challenge.words.length) {
      finished = true;
      props.finish(events);
      return;
    }
    setIndex((i) => i + 1);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
    const given = KEYS[e.key.toLowerCase()];
    if (!given) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("input, textarea, [role=dialog]")) return;
    e.preventDefault();
    answer(given);
  }

  // two big buttons on the phone
  useRemote(
    props.remote,
    () => ({
      kind: "choice",
      options: [
        { id: "seen", label: "seen" },
        { id: "new", label: "new" },
      ],
    }),
    (action) => {
      if (action.type === "choose" && (action.id === "seen" || action.id === "new")) answer(action.id);
    },
  );

  onMount(() => {
    window.addEventListener("keydown", onKeyDown);
    props.started();
  });
  onCleanup(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.clearTimeout(flash);
  });

  return (
    <div class="flex flex-col items-center gap-8">
      <div class="flex items-center gap-8 text-sub">
        <span aria-label={lives() === 1 ? "1 life" : `${lives()} lives`} class="flex gap-1">
          <For each={Array.from({ length: livesOf(props.challenge) }, (_, i) => i)}>
            {(i) => <i class={`fa-solid fa-heart ${i < lives() ? "text-main" : "text-sub"}`} />}
          </For>
        </span>
        <span data-testid="tally">
          score <Bump class="text-main" value={score()} />
        </span>
      </div>
      <span data-testid="word" class={`text-[3rem] ${wrong() ? "text-error" : "text-text"}`}>
        {word()}
      </span>
      {/* a phone: two big buttons, side by side within the thumbs' reach */}
      <div class="flex w-full max-w-md gap-4 sm:w-auto">
        <button type="button" class="btn grow max-sm:min-h-24 max-sm:text-[1.5rem]" onClick={() => answer("seen")}>
          seen <kbd class="touch:hidden">s</kbd> <kbd class="touch:hidden">z</kbd>
        </button>
        <button type="button" class="btn grow max-sm:min-h-24 max-sm:text-[1.5rem]" onClick={() => answer("new")}>
          new <kbd class="touch:hidden">n</kbd> <kbd class="touch:hidden">x</kbd>
        </button>
      </div>
    </div>
  );
}
