import { onMount } from "solid-js";
import { type Feedback, FeedbackMark } from "./feedback";

/**
 * The big answer box of number memory, maths and unjumble: focused on arrival, Enter
 * submits. Answers are typed: pasting or dropping text in does nothing (number memory's
 * number could otherwise be copied off the screen).
 */
export default function AnswerInput(props: {
  label: string;
  value: string;
  onInput: (value: string) => void;
  onEnter: (e: KeyboardEvent, input: HTMLInputElement) => void;
  /** Keep only the digits 0-9. */
  digits?: boolean;
  maxLength?: number;
  /** Shown but not editable (keeps focus, unlike disabled). */
  readOnly?: boolean;
  error?: boolean;
  /** Right and wrong answers flash the box and pop a ✓ or ✗ by it. */
  feedback?: Feedback;
  /** Size and text alignment of the box. */
  class?: string;
  /** The box's width limit (it fills its container up to that). */
  width?: string;
}) {
  let input!: HTMLInputElement;
  onMount(() => input.focus());
  const state = () => {
    const verdict = props.feedback?.verdict();
    if (props.error || verdict === "bad") return "error";
    return verdict === "good" ? "good" : "";
  };
  return (
    <div class={`relative w-full ${props.width ?? ""}`}>
    <input
      ref={input}
      aria-label={props.label}
      class={`field w-full ${state()} ${props.class ?? ""}`}
      inputmode={props.digits ? "numeric" : "text"}
      enterkeyhint="enter"
      maxLength={props.maxLength ?? 40}
      readOnly={props.readOnly}
      autocomplete="off"
      autocapitalize="off"
      spellcheck={false}
      value={props.value}
      onPaste={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      onBeforeInput={(e) => {
        // what the paste and drop events don't cover (a browser's own "paste" menu, …)
        if (/^insertFrom(Paste|Drop|Yank)/.test(e.inputType)) e.preventDefault();
      }}
      onInput={(e) => {
        const raw = e.currentTarget.value;
        const value = props.digits ? raw.replace(/\D/g, "") : raw;
        if (value !== raw) e.currentTarget.value = value;
        props.onInput(value);
      }}
      onKeyDown={(e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        // a held Enter answers once
        if (e.repeat) return;
        props.onEnter(e, input);
      }}
    />
      {props.feedback && <FeedbackMark feedback={props.feedback} />}
    </div>
  );
}
