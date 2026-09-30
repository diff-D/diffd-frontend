import { For, Index, Show, createEffect, createMemo, createSignal } from "solid-js";
import type { DuelCaret } from "../../api/types";
import { type TypingModel, wordView } from "./logic";

type Position = { left: number; top: number };

/**
 * Three visible lines of words with a caret; `version` changes after every keystroke. In a
 * 1v1, the opponent's caret is drawn too.
 */
export default function Words(props: { model: TypingModel; version: number; running: boolean; opponent?: DuelCaret }) {
  let inner!: HTMLDivElement;
  const [caret, setCaret] = createSignal<Position>({ left: 0, top: 0 });
  const [opponent, setOpponent] = createSignal<Position>();
  const [shift, setShift] = createSignal(0);

  /** Where a caret before letter `letter` of word `index` goes (after the word's end if past it). */
  function place(index: number, letter: number): { word: HTMLElement; at: Position } | undefined {
    const word = inner.querySelector<HTMLElement>(`[data-word="${index}"]`);
    if (!word) return undefined;
    const at = word.querySelectorAll<HTMLElement>(".letter")[letter];
    const left = at ? word.offsetLeft + at.offsetLeft : word.offsetLeft + word.offsetWidth;
    return { word, at: { left, top: word.offsetTop } };
  }

  createEffect(() => {
    void props.version;
    const model = props.model;
    const placed = place(model.committed.length, [...model.current].length);
    if (!placed) return;
    // keep the line being typed as the second visible line
    const { word } = placed;
    const style = getComputedStyle(word);
    const marginTop = parseFloat(style.marginTop);
    const pitch = word.offsetHeight + marginTop + parseFloat(style.marginBottom);
    const line = Math.round((word.offsetTop - marginTop) / pitch);
    setShift(Math.max(0, line - 1) * pitch);
    setCaret(placed.at);
  });

  // my typing moves words around too (extra letters), so this follows both
  createEffect(() => {
    void props.version;
    const them = props.opponent;
    setOpponent(them ? place(them.word, them.letter)?.at : undefined);
  });

  return (
    <div class="relative overflow-hidden text-[2rem]" style={{ height: "calc(3 * (1.5em + 2px))" }}>
      <div ref={inner} class="relative flex flex-wrap transition-transform select-none" style={{ transform: `translateY(-${shift()}px)` }}>
        <For each={props.model.challenge.words}>
          {(_, i) => {
            // what was typed into this word (newline-terminated once committed): a keystroke
            // only re-renders the words whose typing it changed
            const typed = createMemo(() => {
              void props.version;
              const committed = props.model.committed[i()];
              if (committed) return `${committed.typed}\n`;
              return i() === props.model.committed.length ? props.model.current : "";
            });
            const view = createMemo(() => {
              typed();
              return wordView(props.model, i());
            });
            return (
              <div data-word={i()} class={`word ${view().error ? "error" : ""}`}>
                <Index each={view().letters}>{(letter) => <span class={`letter ${letter().state}`}>{letter().char}</span>}</Index>
              </div>
            );
          }}
        </For>
        <Show when={opponent()}>
          {(at) => <div data-testid="opponent-caret" class="caret opponent" style={{ left: `${at().left}px`, top: `calc(${at().top}px - 0.1em)` }} />}
        </Show>
        <div class={`caret ${props.running ? "" : "idle"}`} style={{ left: `${caret().left}px`, top: `calc(${caret().top}px - 0.1em)` }} />
      </div>
    </div>
  );
}
