import { Show, createSignal, onCleanup, onMount } from "solid-js";
import type { PlayProps } from "../shell/types";
import { type Key, TypingModel, keyFromEvent, keyName } from "./logic";
import type { TypingChallenge, TypingEvent, TypingSettings } from "./types";
import Words from "./Words";

/** The typing test: words, caret, timer and live wpm. It starts on the first key. */
export default function TypingPlay(props: PlayProps<TypingSettings, TypingChallenge>) {
  const model = new TypingModel(props.challenge);
  const [version, setVersion] = createSignal(0);
  const [elapsed, setElapsed] = createSignal(0);
  const [running, setRunning] = createSignal(false);
  const events: TypingEvent[] = [];
  let startedAt = 0;
  let timer: number | undefined;
  let finished = false;
  let reported = "";

  /** Speed so far, as the result will count it (correct words and letters). */
  const liveWpm = () => {
    const minutes = elapsed() / 60;
    return minutes > 0 ? Math.round(model.correctChars() / 5 / minutes) : 0;
  };
  // the counter moves once a second (every keystroke would make it flicker)
  const [shownWpm, setShownWpm] = createSignal(0);
  let shownAt = 0;
  function refreshWpm(seconds: number) {
    const whole = Math.floor(seconds);
    if (whole <= shownAt) return;
    shownAt = whole;
    setShownWpm(liveWpm());
  }

  /** Tells a 1v1 opponent the shown wpm and the caret, when either changed. */
  function report() {
    const value = shownWpm();
    const caret = { word: model.committed.length, letter: [...model.current].length };
    const key = `${value} ${caret.word} ${caret.letter}`;
    if (key === reported) return;
    reported = key;
    props.progress?.(value, caret);
  }

  function end() {
    if (finished) return;
    finished = true;
    window.clearInterval(timer);
    props.finish(events);
  }

  function tick() {
    const seconds = (performance.now() - startedAt) / 1000;
    setElapsed(seconds);
    refreshWpm(seconds);
    if (model.challenge.mode === "time" && seconds >= model.challenge.limit) end();
    else report();
  }

  /** One keystroke, from a keyboard or a phone's typing (`onInput`). */
  function press(key: Key) {
    if (finished) return;
    const now = performance.now();
    if (!running()) {
      startedAt = now;
      setRunning(true);
      props.started();
      timer = window.setInterval(tick, 100);
    }
    const tMs = now - startedAt;
    if (model.challenge.mode === "time" && tMs > model.challenge.limit * 1000) {
      end();
      return;
    }
    events.push({ t_ms: tMs, key: keyName(key) });
    model.press(key, tMs);
    setElapsed(tMs / 1000);
    setVersion((v) => v + 1);
    if (model.done) end();
    else report();
    syncTyping();
  }

  function onKeyDown(e: KeyboardEvent) {
    const target = e.target as HTMLElement | null;
    // other text boxes (theme search, custom prompt, forms) keep their keys
    if (finished || (target !== typing && target?.closest("input, textarea, [role=dialog]"))) return;
    if (target?.tagName === "BUTTON" && (e.key === "Enter" || e.key === " ")) return;
    const key = keyFromEvent(e);
    // a phone's keyboard often names no key ("Unidentified"): its typing arrives as input
    if (key === null) return;
    e.preventDefault();
    press(key);
  }

  // Phones: an invisible text box over the words opens the on-screen keyboard when the
  // words are tapped. It holds a space and then the word being typed; each change to it is
  // replayed as keystrokes (keyboards that compose words change it a letter or a word at a
  // time), and deleting the space is a backspace at the start of a word.
  let typing!: HTMLInputElement;
  const HOLD = " ";
  let mirrored = "";
  function syncTyping() {
    mirrored = model.current;
    if (typing && typing.value !== HOLD + mirrored) typing.value = HOLD + mirrored;
  }
  function onInput() {
    const value = typing.value;
    const text = value.startsWith(HOLD) ? value.slice(HOLD.length) : value;
    let same = 0;
    while (same < mirrored.length && same < text.length && mirrored[same] === text[same]) same++;
    const back = mirrored.length - same + (value.startsWith(HOLD) ? 0 : 1);
    const keys: Key[] = Array.from({ length: back }, () => ({ kind: "backspace" }) as Key);
    for (const char of text.slice(same)) keys.push(char === " " ? { kind: "space" } : { kind: "char", char });
    for (const key of keys) press(key);
    syncTyping();
  }

  onMount(() => {
    window.addEventListener("keydown", onKeyDown);
    syncTyping();
  });
  onCleanup(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.clearInterval(timer);
  });

  const progress = () => {
    void version();
    return model.challenge.mode === "time"
      ? String(Math.max(0, model.challenge.limit - Math.floor(elapsed())))
      : `${model.committed.length}/${model.challenge.words.length}`;
  };

  return (
    <div class="flex flex-col gap-8">
      <div class={`flex h-[1.25em] gap-8 text-[2rem] ${running() ? "" : "invisible"}`}>
        <span class="text-main">{progress()}</span>
        <span data-testid="live-wpm" class="text-sub">
          {shownWpm()}
        </span>
      </div>
      <div class="relative">
        <Words model={model} version={version()} running={running()} opponent={props.opponentCaret} />
        <input
          ref={typing}
          data-testid="typing-input"
          aria-label="type here"
          class="absolute inset-0 h-full w-full cursor-default bg-transparent text-base text-transparent caret-transparent opacity-0 outline-none"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck={false}
          enterkeyhint="next"
          onInput={onInput}
        />
      </div>
      <Show when={!running()}>
        <p data-testid="tap-to-type" class="hidden text-center text-sm text-sub pointer-coarse:block">
          tap the words to type
        </p>
      </Show>
    </div>
  );
}
