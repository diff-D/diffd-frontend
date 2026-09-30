import { For, Match, Show, Switch, createEffect, createMemo, createSignal, on, onCleanup, onMount } from "solid-js";
import type { PartyChatLine, PartyMember, SketchOp } from "../../api/types";
import type { SketchTurn } from "../createParty";
import PartyChat from "../PartyChat";
import SketchCanvas from "./SketchCanvas";
import { COLOURS, type Mark, PEN_SIZES, applyOps, hex, stepsFor } from "./drawing";

/**
 * A game of sketch: the players and their points, the drawing (with the pen for the
 * drawer), the word as you may see it, and the chat, where the word is guessed.
 */
export default function Sketch(props: {
  turn: SketchTurn;
  words: string[];
  drawing: { epoch: number; ops: SketchOp[]; length: number };
  members: PartyMember[];
  me?: string;
  chat: PartyChatLine[];
  say: (text: string) => void;
  pickWord: (index: number) => void;
  draw: (op: SketchOp) => void;
}) {
  const [now, setNow] = createSignal(performance.now());
  const clock = window.setInterval(() => setNow(performance.now()), 250);
  onCleanup(() => window.clearInterval(clock));
  const secondsLeft = () => Math.max(0, Math.ceil((props.turn.endsAt - now()) / 1000));

  const [colour, setColour] = createSignal(COLOURS[0]);
  const [size, setSize] = createSignal(PEN_SIZES[1]);
  const [tool, setTool] = createSignal<"pen" | "fill">("pen");
  const drawer = () => props.turn.drawer === props.me;
  const drawing = () => drawer() && props.turn.phase === "drawing";

  // what undo took back, to redo (forgotten on anything new, and with each drawing)
  const [undone, setUndone] = createSignal<Mark[]>([]);
  const epoch = createMemo(() => props.drawing.epoch);
  createEffect(on(epoch, () => setUndone([])));
  const draw = (op: SketchOp) => {
    if (op.k === "line" || op.k === "fill" || op.k === "clear") setUndone([]);
    props.draw(op);
  };
  function undo() {
    const last = applyOps([], props.drawing.ops.slice(0, props.drawing.length)).at(-1);
    if (!last) return;
    setUndone((marks) => [...marks, last]);
    props.draw({ k: "undo" });
  }
  function redo() {
    const mark = undone().at(-1);
    if (!mark) return;
    setUndone((marks) => marks.slice(0, -1));
    for (const step of stepsFor(mark)) props.draw(step);
  }
  // ctrl+z undoes, ctrl+y (or ctrl+shift+z) redoes; not while typing in the chat
  const onKey = (e: KeyboardEvent) => {
    if (!drawing() || !(e.ctrlKey || e.metaKey) || e.altKey) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) undo();
    else if (key === "y" || (key === "z" && e.shiftKey)) redo();
    else return;
    e.preventDefault();
  };
  window.addEventListener("keydown", onKey);
  onCleanup(() => window.removeEventListener("keydown", onKey));
  const nameOf = (id: string) => props.members.find((m) => m.id === id)?.name ?? "someone";
  const points = (list: { id: string; points: number }[], id: string) => list.find((s) => s.id === id)?.points ?? 0;
  /** Everyone in the game (or who joined it since), by points. */
  const players = () =>
    props.members
      .filter((m) => !m.away || props.turn.scores.some((s) => s.id === m.id))
      .map((m) => ({ ...m, score: points(props.turn.scores, m.id) }))
      .sort((a, b) => b.score - a.score);
  // the drawing fills its column's width, unless that would take it past the window's
  // bottom (with the drawer's tools under it): then it is as tall as fits
  let cell!: HTMLDivElement;
  let paper!: HTMLDivElement;
  let tools: HTMLDivElement | undefined;
  const [width, setWidth] = createSignal(640);
  const fit = () => {
    if (!cell || !paper) return;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const top = paper.getBoundingClientRect().top + window.scrollY;
    // the tools as they are (wrapped or not), or room for them before they show
    const toolsTall = drawer() ? (tools?.isConnected ? tools.offsetHeight : 2.75 * rem) + 0.75 * rem : 0;
    const below = toolsTall + 1.5 * rem;
    const tall = window.innerHeight - top - below;
    setWidth(Math.floor(Math.max(18 * rem, Math.min(cell.clientWidth, (tall * 4) / 3))));
  };
  onMount(() => {
    const observer = new ResizeObserver(fit);
    observer.observe(cell);
    window.addEventListener("resize", fit);
    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener("resize", fit);
    });
    fit();
  });
  createEffect(on([drawer, () => props.turn.phase], () => queueMicrotask(fit)));
  const guessing = () => props.turn.phase === "drawing" && !drawer() && !props.turn.guessed.includes(props.me ?? "");

  return (
    <div data-testid="sketch" data-phase={props.turn.phase} class="grid gap-4 md:grid-cols-[1fr_16rem] xl:grid-cols-[12rem_1fr_18rem] xl:gap-6">
      {/* the drawing as big as its column and the window allow (see `fit`), the chat beside it from md up */}
      <div ref={cell} class="min-w-0 md:col-start-1 md:row-start-1 xl:col-start-2">
      <main class="mx-auto flex flex-col gap-3" style={{ width: `${width()}px` }}>
        <div class="flex items-center gap-4">
          <span data-testid="sketch-timer" class="w-12 text-[1.5rem] text-main tabular-nums">
            {secondsLeft()}
          </span>
          <div class="flex grow flex-col items-center">
            <Switch>
              <Match when={props.turn.phase === "choosing"}>
                <span class="text-sub">{drawer() ? "pick a word to draw" : `${nameOf(props.turn.drawer)} is picking a word…`}</span>
              </Match>
              <Match when={props.turn.phase === "reveal"}>
                <span class="text-sub">time's up</span>
              </Match>
              <Match when={drawer() && props.turn.word}>
                <span class="text-sm text-sub">draw</span>
                <span data-testid="sketch-word" class="text-[1.5rem] text-text">
                  {props.turn.word}
                </span>
              </Match>
              <Match when={props.turn.mask}>
                {(mask) => (
                  <>
                    <span class="text-sm text-sub">{guessing() ? "guess the word" : "you got it"}</span>
                    <span class="flex items-baseline gap-2">
                      <span data-testid="sketch-mask" class="text-[1.5rem] tracking-[0.3em] text-text">
                        {mask()}
                      </span>
                      <span class="text-sm text-sub">{mask().replace(/ /g, "").length}</span>
                    </span>
                  </>
                )}
              </Match>
            </Switch>
          </div>
          <span class="w-12 text-right text-sm text-sub">
            {props.turn.turn}/{props.turn.turns}
          </span>
        </div>

        <div ref={paper} class="relative">
          <SketchCanvas drawing={props.drawing} onDraw={drawing() ? draw : undefined} colour={colour()} size={size()} tool={tool()} />
          <Show when={props.turn.phase !== "drawing"}>
            <div class="absolute inset-0 flex items-center justify-center rounded-lg bg-bg/60 p-4">
              <div class="flex flex-col items-center gap-4 rounded-lg bg-bg px-8 py-6 text-center shadow-xl">
              <Switch>
                <Match when={props.turn.phase === "choosing" && drawer() && props.words.length > 0}>
                  <span class="text-sub">your turn to draw: pick one</span>
                  <div class="flex flex-wrap justify-center gap-3">
                    <For each={props.words}>
                      {(word, i) => (
                        <button type="button" data-testid="sketch-choice" class="btn primary" onClick={() => props.pickWord(i())}>
                          {word}
                        </button>
                      )}
                    </For>
                  </div>
                </Match>
                <Match when={props.turn.phase === "choosing"}>
                  <span class="text-sub">{nameOf(props.turn.drawer)} is picking a word…</span>
                </Match>
                <Match when={props.turn.phase === "reveal"}>
                  <span class="text-sub">the word was</span>
                  <span data-testid="sketch-word" class="text-[2rem] text-main">
                    {props.turn.word || "–"}
                  </span>
                  <ul data-testid="sketch-gains" class="flex flex-col gap-1 text-sm">
                    <For each={[...props.turn.gains].sort((a, b) => b.points - a.points)} fallback={<li class="text-sub">nobody got it</li>}>
                      {(gain) => (
                        <li class="text-text">
                          {nameOf(gain.id)} <span class="text-main">+{gain.points}</span>
                        </li>
                      )}
                    </For>
                  </ul>
                </Match>
              </Switch>
              </div>
            </div>
          </Show>
        </div>

        <Show when={drawing()}>
          <div ref={tools} data-testid="sketch-tools" class="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="colour" class="flex flex-wrap gap-1">
              <For each={COLOURS}>
                {(c, i) => (
                  <button
                    type="button"
                    aria-label={`colour ${i() + 1}`}
                    aria-pressed={colour() === c}
                    class={`size-7 rounded-full border border-sub ${colour() === c ? "ring-2 ring-main ring-offset-2 ring-offset-bg" : ""}`}
                    style={{ background: hex(c) }}
                    onClick={() => setColour(c)}
                  />
                )}
              </For>
              {/* any other colour */}
              <label
                title="pick any colour"
                class={`relative flex size-7 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-sub ${COLOURS.includes(colour()) ? "" : "ring-2 ring-main ring-offset-2 ring-offset-bg"}`}
                style={{ background: COLOURS.includes(colour()) ? "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" : hex(colour()) }}
              >
                <input
                  type="color"
                  aria-label="custom colour"
                  class="absolute inset-0 cursor-pointer opacity-0"
                  value={hex(colour())}
                  onInput={(e) => setColour(parseInt(e.currentTarget.value.slice(1), 16))}
                />
              </label>
            </div>
            <div role="group" aria-label="tool" class="flex items-center gap-1">
              <button type="button" aria-label="pen" title="pen" aria-pressed={tool() === "pen"} class={`flex size-8 items-center justify-center rounded ${tool() === "pen" ? "bg-sub-alt text-main" : "text-sub"}`} onClick={() => setTool("pen")}>
                <i class="fa-solid fa-pen" />
              </button>
              <button type="button" aria-label="fill" title="fill an area" aria-pressed={tool() === "fill"} class={`flex size-8 items-center justify-center rounded ${tool() === "fill" ? "bg-sub-alt text-main" : "text-sub"}`} onClick={() => setTool("fill")}>
                <i class="fa-solid fa-fill-drip" />
              </button>
            </div>
            <div role="group" aria-label="pen size" class="flex items-center gap-1">
              <For each={PEN_SIZES}>
                {(w) => (
                  <button
                    type="button"
                    aria-label={`pen ${w}`}
                    aria-pressed={size() === w}
                    class={`flex size-8 items-center justify-center rounded ${size() === w ? "bg-sub-alt" : ""}`}
                    onClick={() => {
                      setSize(w);
                      setTool("pen");
                    }}
                  >
                    <span class="rounded-full bg-text" style={{ width: `${Math.max(4, w / 1.2)}px`, height: `${Math.max(4, w / 1.2)}px` }} />
                  </button>
                )}
              </For>
            </div>
            <div class="ml-auto flex gap-2">
              <button type="button" class="btn" aria-label="undo" title="undo (ctrl+z)" disabled={props.drawing.length === 0} onClick={undo}>
                <i class="fa-solid fa-rotate-left" />
              </button>
              <button type="button" class="btn" aria-label="redo" title="redo (ctrl+y)" disabled={undone().length === 0} onClick={redo}>
                <i class="fa-solid fa-rotate-right" />
              </button>
              <button type="button" class="btn" aria-label="clear" title="clear" onClick={() => draw({ k: "clear" })}>
                <i class="fa-solid fa-trash" />
              </button>
            </div>
          </div>
        </Show>
      </main>
      </div>

      <aside class="flex min-h-0 flex-col md:col-start-2 md:row-span-2 md:row-start-1 xl:col-start-3 xl:row-span-1">
        <PartyChat lines={props.chat} me={props.me} send={props.say} placeholder={guessing() ? "type your guess" : undefined} fill />
      </aside>
      <aside class="flex flex-col gap-2 md:col-start-1 md:row-start-2 xl:row-start-1">
        <h2 class="text-sub">
          round {props.turn.round}/{props.turn.rounds}
        </h2>
        <ol data-testid="sketch-players" class="flex flex-col gap-1">
          <For each={players()}>
            {(m) => (
              <li class={`flex items-center gap-2 rounded px-2 py-1 ${m.id === props.me ? "bg-sub-alt" : ""}`}>
                <i
                  class={`fa-solid fa-fw ${m.id === props.turn.drawer ? "fa-pencil text-main" : props.turn.guessed.includes(m.id) ? "fa-check text-main" : "fa-circle text-sub-alt"}`}
                />
                <span class="grow text-text">{m.name}</span>
                <span class="text-sm text-sub">{m.score}</span>
              </li>
            )}
          </For>
        </ol>
      </aside>

    </div>
  );
}
