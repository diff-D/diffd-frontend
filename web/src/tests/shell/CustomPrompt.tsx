import { For, createSignal, onMount } from "solid-js";
import Sheet from "../../ui/Sheet";
import { type CustomPrompt, clamp } from "./settings";

/** A small modal for custom numbers; Enter applies (clamped to the limits), Esc cancels. */
export default function CustomPromptDialog(props: {
  prompt: CustomPrompt<unknown>;
  onApply: (next: unknown) => void;
  onClose: () => void;
}) {
  const [values, setValues] = createSignal(props.prompt.inputs.map((input) => String(input.value)));
  let first: HTMLInputElement | undefined;
  onMount(() => first?.select());

  function apply(e: SubmitEvent) {
    e.preventDefault();
    const numbers = props.prompt.inputs.map((input, i) => {
      const text = values()[i].trim();
      const n = Number(text);
      return text !== "" && Number.isFinite(n) ? clamp(n, input.min, input.max) : input.value;
    });
    props.onApply(props.prompt.apply(numbers));
  }

  return (
    <Sheet label={props.prompt.title} onClose={() => props.onClose()} top="20vh" class="sm:w-[min(24rem,90vw)]">
      <form class="flex flex-col gap-4 p-6 pt-0 text-base sm:pt-6" onSubmit={apply}>
        <h2 class="text-text">{props.prompt.title}</h2>
        <For each={props.prompt.inputs}>
          {(input, i) => (
            <label class="flex flex-col gap-1 text-sm text-sub">
              {input.label} ({input.min}–{input.max})
              <input
                ref={(el) => {
                  if (i() === 0) first = el;
                }}
                class="field text-base"
                type="number"
                min={input.min}
                max={input.max}
                step="1"
                value={String(input.value)}
                onInput={(e) => {
                  const text = e.currentTarget.value;
                  setValues((all) => all.map((value, j) => (j === i() ? text : value)));
                }}
              />
            </label>
          )}
        </For>
        <button type="submit" class="btn">
          apply
        </button>
      </form>
    </Sheet>
  );
}
