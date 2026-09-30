import { Show, createSignal, onCleanup } from "solid-js";

export type Verdict = "good" | "bad";

/**
 * A right or wrong answer, shown for a moment and kept quiet (Monkeytype-like): the answer
 * box's outline takes the theme's main or error colour (a wrong one with a small shake)
 * and a small ✓ or ✗ fades by it. Each call replays it, even for the same verdict twice in a row.
 * Purely visual: nothing waits for it.
 */
export function createFeedback(ms = 500) {
  const [shown, setShown] = createSignal<{ verdict: Verdict; id: number }>();
  let count = 0;
  let timer: number | undefined;
  let frame: number | undefined;
  function show(verdict: Verdict) {
    window.clearTimeout(timer);
    if (frame !== undefined) cancelAnimationFrame(frame);
    // off for a frame, so the same animation plays again
    setShown(undefined);
    frame = requestAnimationFrame(() => {
      frame = undefined;
      setShown({ verdict, id: ++count });
      timer = window.setTimeout(() => setShown(undefined), ms);
    });
  }
  onCleanup(() => {
    window.clearTimeout(timer);
    if (frame !== undefined) cancelAnimationFrame(frame);
  });
  return {
    /** The verdict being shown, if any. */
    verdict: () => shown()?.verdict,
    shown,
    good: () => show("good"),
    bad: () => show("bad"),
  };
}

export type Feedback = ReturnType<typeof createFeedback>;

/** A small ✓ or ✗ that fades in and out inside the answer box (its parent must be `relative`). */
export function FeedbackMark(props: { feedback: Feedback }) {
  return (
    <Show when={props.feedback.shown()} keyed>
      {(shown) => (
        <i
          data-testid="feedback-mark"
          data-verdict={shown.verdict}
          aria-hidden="true"
          class={`mark-pop pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-base fa-solid ${
            shown.verdict === "good" ? "fa-check text-main" : "fa-xmark text-error"
          }`}
        />
      )}
    </Show>
  );
}

/** A number that pops each time it changes (a score going up). */
export function Bump(props: { value: number | string; class?: string; testId?: string }) {
  return (
    <Show when={String(props.value)} keyed>
      {(value) => (
        <span data-testid={props.testId} class={`bump inline-block ${props.class ?? ""}`}>
          {value}
        </span>
      )}
    </Show>
  );
}
