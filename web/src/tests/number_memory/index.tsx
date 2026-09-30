import { Match, Switch, createSignal, onCleanup, onMount } from "solid-js";
import AnswerInput from "../shell/AnswerInput";
import { type RemoteSpec, useRemote } from "../shell/remote";
import type { PlayProps } from "../shell/types";
import Comparison from "./Comparison";
import { MAX_LEVEL, showMs } from "./logic";
import type { NumberMemoryChallenge, NumberMemoryEvent, NumberMemorySettings } from "./types";

type Stage = "show" | "answer" | "right";

/** A number shows for a moment, then you type it back; each level adds a digit. */
export default function NumberMemoryPlay(props: PlayProps<NumberMemorySettings, NumberMemoryChallenge>) {
  const t0 = performance.now();
  const events: NumberMemoryEvent[] = [];
  const [level, setLevel] = createSignal(props.challenge.start_level);
  const [stage, setStage] = createSignal<Stage>("show");
  const [answer, setAnswer] = createSignal("");
  let timer: number | undefined;

  const number = () => props.challenge.numbers[level() - 1];

  function show() {
    setAnswer("");
    setStage("show");
    timer = window.setTimeout(() => setStage("answer"), showMs(level()));
  }

  function submit() {
    if (answer() === "") return;
    events.push({ t_ms: performance.now() - t0, level: level(), answer: answer() });
    if (answer() !== number() || level() === MAX_LEVEL) props.finish(events);
    else {
      props.progress?.(level());
      setStage("right");
    }
  }

  function next() {
    setLevel((n) => n + 1);
    show();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter" || stage() !== "right") return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, [role=dialog]")) return;
    e.preventDefault();
    next();
  }

  useRemote(
    props.remote,
    (): RemoteSpec => {
      if (stage() === "show") return { kind: "wait", text: "remember the number on screen" };
      if (stage() === "right") return { kind: "next", text: `level ${level() + 1}` };
      return { kind: "keypad", value: answer(), enter: "submit" };
    },
    (action) => {
      if (stage() === "right" && action.type === "next") next();
      if (stage() !== "answer") return;
      if (action.type === "key" && answer().length < MAX_LEVEL) setAnswer(answer() + action.key);
      else if (action.type === "back") setAnswer(answer().slice(0, -1));
      else if (action.type === "enter") submit();
    },
  );

  onMount(() => {
    window.addEventListener("keydown", onKeyDown);
    props.started();
    show();
  });
  onCleanup(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.clearTimeout(timer);
  });

  return (
    <div class="flex flex-col items-center gap-8 text-center">
      <span class="text-sub">level {level()}</span>
      <Switch>
        <Match when={stage() === "show"}>
          {/* not to be selected or copied: it's to be remembered */}
          <span
            data-testid="number"
            class="text-[4rem] leading-none tracking-[0.2em] break-all text-text select-none"
            onCopy={(e) => e.preventDefault()}
            onCut={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            {number()}
          </span>
          <div class="h-1 w-64 overflow-hidden rounded bg-sub-alt">
            <div class="countdown h-full bg-main" style={{ "animation-duration": `${showMs(level())}ms` }} />
          </div>
        </Match>
        <Match when={stage() === "answer"}>
          <span class="text-[2rem] text-sub">what was the number?</span>
          <AnswerInput
            label="the number"
            digits
            maxLength={MAX_LEVEL}
            value={answer()}
            onInput={setAnswer}
            onEnter={submit}
            width="max-w-xl"
            class="text-center text-[2rem]"
          />
        </Match>
        <Match when={stage() === "right"}>
          <Comparison expected={number()} given={answer()} />
          <button type="button" class="btn" onClick={next}>
            level {level() + 1} <kbd class="touch:hidden">enter</kbd>
          </button>
        </Match>
      </Switch>
    </div>
  );
}
