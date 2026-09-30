import { For } from "solid-js";

/** Right or wrong, then the number and the answer given, each digit marked. */
export default function Comparison(props: { expected: string; given: string }) {
  const right = () => props.given === props.expected;
  return (
    <div data-testid="comparison" class="flex flex-col items-center gap-2">
      <span
        data-testid="verdict"
        class={`mark-pop-in mb-2 flex items-center gap-2 text-[1.5rem] ${right() ? "text-main" : "text-error"}`}
      >
        <i class={`fa-solid ${right() ? "fa-circle-check" : "fa-circle-xmark"}`} />
        {right() ? "correct" : "wrong"}
      </span>
      <span class="text-sm text-sub">number</span>
      <span class="text-[2rem] tracking-[0.2em] break-all text-text">{props.expected}</span>
      <span class="text-sm text-sub">you</span>
      <span class="text-[2rem] tracking-[0.2em] break-all">
        <For each={[...props.given]}>
          {(digit, i) => <span class={digit === props.expected[i()] ? "text-main" : "text-error"}>{digit}</span>}
        </For>
      </span>
    </div>
  );
}
