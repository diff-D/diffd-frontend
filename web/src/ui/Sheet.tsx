import { type JSX, createSignal, onCleanup, onMount } from "solid-js";

/**
 * A dialog: centred on a computer; on a phone a sheet from the bottom, within the thumb's
 * reach, above the home bar and the keyboard (`--kb`), that a swipe down on its handle
 * closes. Escape and a tap outside close it too. `class`: the panel's width from `sm` up.
 */
export default function Sheet(props: {
  label: string;
  onClose: () => void;
  children: JSX.Element;
  class?: string;
  /** How far down a computer's screen the panel starts. */
  top?: string;
  testId?: string;
}) {
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    e.preventDefault();
    props.onClose();
  };
  onMount(() => window.addEventListener("keydown", onKey));
  onCleanup(() => window.removeEventListener("keydown", onKey));

  // a swipe down on the handle: the sheet follows the finger, and far enough closes it
  const [pulled, setPulled] = createSignal(0);
  let from: number | undefined;
  return (
    <div
      class="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(0,0,0,0.5)] sm:items-start sm:pt-[var(--sheet-top)]"
      style={{ "--sheet-top": props.top ?? "10vh" }}
      onClick={() => props.onClose()}
    >
      <div
        role="dialog"
        aria-label={props.label}
        data-testid={props.testId}
        class={`flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-bg pb-[calc(env(safe-area-inset-bottom)+var(--kb,0px))] shadow-xl sm:max-h-[80vh] sm:rounded-lg sm:pb-0 ${props.class ?? "sm:w-[min(28rem,90vw)]"}`}
        style={{ transform: pulled() > 0 ? `translateY(${pulled()}px)` : undefined }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          data-testid="sheet-handle"
          class="flex shrink-0 touch-none justify-center py-3 sm:hidden"
          onPointerDown={(e) => {
            from = e.clientY;
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (from !== undefined) setPulled(Math.max(0, e.clientY - from));
          }}
          onPointerUp={() => {
            if (pulled() > 80) props.onClose();
            from = undefined;
            setPulled(0);
          }}
          onPointerCancel={() => {
            from = undefined;
            setPulled(0);
          }}
        >
          <span class="h-1 w-10 rounded-full bg-sub" />
        </div>
        {props.children}
      </div>
    </div>
  );
}
