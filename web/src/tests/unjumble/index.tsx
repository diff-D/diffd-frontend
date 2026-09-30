import { Show, createSignal, onCleanup, onMount } from "solid-js";
import AnswerInput from "../shell/AnswerInput";
import SkipButton from "../shell/SkipButton";
import { useRemote } from "../shell/remote";
import { Bump, createFeedback } from "../shell/feedback";
import type { PlayProps } from "../shell/types";
import { dictionary } from "./dictionary";
import { accepts } from "./logic";
import type { LiveMessage } from "../shell/live";
import type { UnjumbleChallenge, UnjumbleEvent, UnjumbleLive, UnjumbleSettings } from "./types";

/**
 * Scrambled words against the clock: a right word goes in as soon as it is typed; Enter
 * tries a word anyway (a wrong one shakes), Shift+Enter skips. Each answer is marked ✓ or ✗,
 * and the last word solved stays in view.
 */
export default function UnjumblePlay(props: PlayProps<UnjumbleSettings, UnjumbleChallenge>) {
  const live = props.live;
  const t0 = performance.now();
  const limitMs = props.challenge.time_s * 1000;
  /** When the clock runs out (live: the server's, as it said). */
  let endsAt = t0 + limitMs;
  // live, the server has the words and judges them
  const words = live ? new Set<string>() : dictionary();
  /** Live: the word on screen, as the server sent it. */
  const [shown, setShown] = createSignal("");
  const events: UnjumbleEvent[] = [];
  const [index, setIndex] = createSignal(0);
  const [guess, setGuess] = createSignal("");
  const [solved, setSolved] = createSignal(0);
  const [skipped, setSkipped] = createSignal(0);
  const [left, setLeft] = createSignal(props.challenge.time_s);
  /** The last word solved, to show it went in. */
  const [last, setLast] = createSignal("");
  const feedback = createFeedback();
  let finished = false;

  const scrambled = () => (live ? shown() : props.challenge.scrambled[index()]);

  const clock = window.setInterval(() => {
    const now = performance.now();
    setLeft(Math.max(0, Math.ceil((endsAt - now) / 1000)));
    if (!live && now - t0 >= limitMs) end();
  }, 100);

  function end() {
    if (finished) return;
    finished = true;
    window.clearInterval(clock);
    props.finish(events);
  }

  /** Times the guess was cleared: tells a phone to clear its box too. */
  const [clears, setClears] = createSignal(0);

  function advance() {
    setGuess("");
    setClears((n) => n + 1);
    if (index() + 1 === props.challenge.scrambled.length) end();
    else setIndex((i) => i + 1);
  }

  const right = (word: string) => accepts(scrambled(), word, (w) => words.has(w));

  /** Records a guess; true if the time was not up. */
  function record(word: string): boolean {
    const t = performance.now() - t0;
    if (t > limitMs) {
      end();
      return false;
    }
    events.push({ t_ms: t, index: index(), guess: word });
    return true;
  }

  function solve() {
    setLast(guess());
    feedback.good();
    setSolved((n) => n + 1);
    props.progress?.(solved());
    advance();
  }

  function onInput(value: string) {
    setGuess(value);
    if (live) {
      if (!finished && value.trim() !== "") live.send({ type: "typed", value, index: index() });
      return;
    }
    // no Enter needed: the right word goes in as it is typed
    if (!finished && right(value) && record(value)) solve();
  }

  /** Shift+Enter: on to the next word. */
  function skip() {
    if (live) return live.send({ type: "skip", index: index() });
    const t = performance.now() - t0;
    if (t > limitMs) return end();
    events.push({ t_ms: t, index: index(), skip: true });
    setSkipped((n) => n + 1);
    advance();
  }

  /** Enter: tries the guess; true when it was right. */
  function tryGuess(): boolean {
    if (live) {
      if (guess().trim() !== "") live.send({ type: "enter", value: guess(), index: index() });
      return true;
    }
    if (guess().trim() === "" || !record(guess())) return false;
    if (right(guess())) {
      solve();
      return true;
    }
    feedback.bad();
    return false;
  }

  function onEnter(e: KeyboardEvent, input: HTMLInputElement) {
    if (finished) return;
    if (e.shiftKey) return skip();
    // a wrong guess stays, selected, so a typo is quick to fix
    if (!tryGuess() && guess().trim() !== "") input.select();
  }

  // a phone types the guess on its own keyboard
  useRemote(
    props.remote,
    () => ({ kind: "text", prompt: scrambled(), clear: clears(), enter: "try", skip: "skip", verdict: feedback.shown(), index: index() }),
    (action) => {
      if (finished) return;
      // live, the phone gave its word to the server itself (the verdict comes from there)
      if (action.type === "live") return;
      if (action.type === "text") onInput(action.value.slice(0, 20));
      else if (action.type === "enter") tryGuess();
      else if (action.type === "skip") skip();
    },
    live,
  );

  /** Live: what the server says. */
  function heard(message: LiveMessage) {
    const m = message as UnjumbleLive;
    switch (m.type) {
      case "clock":
        endsAt = live!.deadline(m.at_ms, m.ends_in_ms);
        return;
      case "word":
        setIndex(m.index);
        setShown(m.scrambled);
        return;
      case "right":
        setLast(m.word);
        feedback.good();
        setSolved(m.solved);
        props.progress?.(solved());
        setGuess("");
        setClears((n) => n + 1);
        return;
      case "wrong":
        feedback.bad();
        return;
      case "skipped":
        setSkipped((n) => n + 1);
        setGuess("");
        setClears((n) => n + 1);
        return;
      case "over":
        end();
    }
  }
  if (live) onCleanup(live.onMessage(heard));

  onMount(() => {
    props.started();
    live?.begin();
  });
  onCleanup(() => window.clearInterval(clock));

  return (
    <div class="flex flex-col items-center gap-8 text-center">
      <div class="flex w-full max-w-xl items-end justify-between">
        <span class="text-[2rem] text-main">{left()}</span>
        <span class="text-sub">
          solved <Bump class="text-main" value={solved()} /> · skipped {skipped()}
        </span>
      </div>
      <span data-testid="scrambled" class="text-[3rem] tracking-[0.3em] text-text">
        {scrambled()}
      </span>
      <AnswerInput
        label="your word"
        value={guess()}
        onInput={onInput}
        onEnter={onEnter}
        feedback={feedback}
        maxLength={20}
        width="max-w-md"
        class="text-center text-[2rem]"
      />
      <SkipButton onSkip={skip} />
      <p data-testid="last-solved" class="h-6 text-main" aria-live="polite">
        <Show when={last()}>
          <i class="fa-solid fa-check" /> {last()}
        </Show>
      </p>
    </div>
  );
}
