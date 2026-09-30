import { Show, createSignal, onCleanup, onMount } from "solid-js";
import type { LiveMessage } from "../shell/live";
import AnswerInput from "../shell/AnswerInput";
import { Bump, createFeedback } from "../shell/feedback";
import { useRemote } from "../shell/remote";
import type { PlayProps } from "../shell/types";
import { REVEAL_MS, SYMBOLS, solve } from "./logic";
import type { MathsChallenge, MathsEvent, MathsLive, MathsSettings, Problem } from "./types";

/**
 * Problems against the clock, Matiks-style: the right answer moves on as soon as it is
 * typed; Enter gives up on a problem (counted wrong) and shows its answer for a moment.
 * Played live (`props.live`), the problems come from the server one at a time and it
 * judges the answers; otherwise the page has them all and judges them itself.
 */
export default function MathsPlay(props: PlayProps<MathsSettings, MathsChallenge>) {
  const live = props.live;
  const t0 = performance.now();
  const limitMs = props.challenge.time_s * 1000;
  /** Live: when the server's clock runs out (`performance.now()` time). */
  let endsAt = t0 + limitMs;
  const events: MathsEvent[] = [];
  const [index, setIndex] = createSignal(0);
  /** Live: the problem on screen, as the server sent it (none until the first arrives). */
  const [shown, setShown] = createSignal<Problem>();
  /** Live: the next problem, held back while a wrong answer's answer is on screen. */
  let queued: { index: number; problem: Problem } | undefined;
  const [answer, setAnswer] = createSignal("");
  const [correct, setCorrect] = createSignal(0);
  /** After a wrong answer: the right one, and what was given. */
  const [reveal, setReveal] = createSignal<number | null>(null);
  const [given, setGiven] = createSignal("");
  const feedback = createFeedback();
  const [left, setLeft] = createSignal(props.challenge.time_s);
  let pause: number | undefined;
  let finished = false;

  const problem = (): Problem | undefined => (live ? shown() : props.challenge.problems[index()]);

  const clock = window.setInterval(() => {
    const now = performance.now();
    setLeft(Math.max(0, Math.ceil((endsAt - now) / 1000)));
    // live, the server says when it's over
    if (!live && now - t0 >= limitMs) end();
  }, 100);

  function end() {
    if (finished) return;
    finished = true;
    window.clearInterval(clock);
    window.clearTimeout(pause);
    props.finish(events);
  }

  function next() {
    setReveal(null);
    if (index() + 1 === props.challenge.problems.length) end();
    else setIndex((i) => i + 1);
  }

  function submit() {
    if (finished || reveal() !== null || answer() === "") return;
    if (live) {
      // the server judges it (and shows the answer if it's wrong)
      live.send({ type: "enter", value: answer(), index: index() });
      setGiven(answer());
      return;
    }
    const t = performance.now() - t0;
    if (t > limitMs) return end();
    const given = Number(answer());
    const expected = solve(props.challenge.problems[index()]);
    events.push({ t_ms: t, index: index(), answer: given });
    setGiven(answer());
    setAnswer("");
    if (given === expected) {
      setCorrect((n) => n + 1);
      props.progress?.(correct());
      feedback.good();
      next();
    } else {
      feedback.bad();
      setReveal(expected);
      pause = window.setTimeout(next, REVEAL_MS);
    }
  }

  /** The answer so far changed (typed here or on a phone): a right one goes in by itself. */
  function typed(value: string) {
    if (reveal() !== null) return;
    setAnswer(value);
    if (live) {
      if (value !== "") live.send({ type: "typed", value, index: index() });
    } else if (value !== "" && Number(value) === solve(props.challenge.problems[index()])) submit();
  }

  /** Live: what the server says. */
  function heard(message: LiveMessage) {
    const m = message as MathsLive;
    switch (m.type) {
      case "clock":
        endsAt = live!.deadline(m.at_ms, m.ends_in_ms);
        return;
      case "problem": {
        const next = { index: m.index, problem: { a: m.a, op: m.op, b: m.b } };
        if (reveal() !== null) queued = next;
        else show(next);
        return;
      }
      case "right":
        setCorrect(m.correct);
        props.progress?.(correct());
        feedback.good();
        setAnswer("");
        return;
      case "wrong":
        feedback.bad();
        setGiven(String(m.given));
        setAnswer("");
        setReveal(m.answer);
        pause = window.setTimeout(() => {
          setReveal(null);
          if (queued) show(queued);
          queued = undefined;
        }, REVEAL_MS);
        return;
      case "over":
        end();
    }
  }

  function show(next: { index: number; problem: Problem }) {
    setIndex(next.index);
    setShown(next.problem);
  }
  if (live) onCleanup(live.onMessage(heard));

  useRemote(
    props.remote,
    () => ({ kind: "keypad", value: reveal() === null ? answer() : `${given()} → ${reveal()}`, enter: "give up", verdict: feedback.shown(), index: index() }),
    (action) => {
      // live, the phone answered the server itself: this page just shows what it typed
      if (action.type === "live") {
        if (action.shown === index() && reveal() === null && action.input.type === "typed") setAnswer(action.input.value ?? "");
        return;
      }
      if (action.type === "key" && answer().length < 6) typed(answer() + action.key);
      else if (action.type === "back") typed(answer().slice(0, -1));
      else if (action.type === "enter") submit();
    },
    live,
  );

  onMount(() => {
    props.started();
    live?.begin();
  });
  onCleanup(() => {
    window.clearInterval(clock);
    window.clearTimeout(pause);
  });

  return (
    // a column sum: the numbers right-aligned over a rule, the answer box underneath
    <div class="flex w-[min(18rem,90vw)] flex-col gap-4 self-center">
      <div class="flex items-end justify-between">
        <span class="text-[2rem] text-main">{left()}</span>
        <span class="flex items-baseline gap-2 text-sub">
          score
          <Bump testId="score" class="text-[2rem] text-main" value={correct()} />
        </span>
      </div>
      <div
        data-testid="problem"
        class={`grid grid-cols-[auto_1fr] gap-x-4 text-[3rem] leading-tight ${reveal() === null ? "text-text" : "text-error"}`}
      >
        <span />
        <span data-testid="operand-a" class="justify-self-end">
          {problem()?.a ?? "·"}
        </span>
        <span data-testid="operator" class="text-sub">
          {problem() ? SYMBOLS[problem()!.op] : ""}
        </span>
        <span data-testid="operand-b" class="justify-self-end">
          {problem()?.b ?? "·"}
        </span>
      </div>
      <div class="h-[3px] rounded bg-sub" />
      <AnswerInput
        label="your answer"
        digits
        maxLength={6}
        readOnly={reveal() !== null}
        error={reveal() !== null}
        feedback={feedback}
        value={reveal() === null ? answer() : given()}
        onInput={typed}
        onEnter={submit}
        class="text-right text-[3rem]"
      />
      <p data-testid="maths-verdict" class="h-6 text-right text-error" aria-live="polite">
        <Show when={reveal() !== null}>
          wrong · the answer is <span class="text-text">{reveal()}</span>
        </Show>
      </p>
    </div>
  );
}
