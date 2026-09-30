import { Show, onCleanup, onMount } from "solid-js";
import { isTouch } from "../../state/device";
import { type RemoteLink, useRemote } from "./remote";
import type { AnyTestDef } from "./types";

/** Before play: what the test is and how to play it; Enter, a click or a paired phone starts. */
export default function StartScreen(props: { def: AnyTestDef; onStart: () => void; remote?: RemoteLink }) {
  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "Enter") return;
    const target = e.target as HTMLElement | null;
    // a focused button (the restart button) handles its own Enter
    if (target?.closest("button, a, input, textarea, [role=dialog]")) return;
    e.preventDefault();
    props.onStart();
  }
  onMount(() => window.addEventListener("keydown", onKeyDown));
  // a paired phone shows the test's controls greyed out (to size them first); a tap starts
  useRemote(
    props.remote,
    () => {
      const preview = props.def.remotePreview;
      return preview ? { kind: "start", preview, text: "tap anywhere to start" } : { kind: "next", text: "start" };
    },
    (action) => action.type === "next" && props.onStart(),
  );
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  return (
    <button
      type="button"
      data-testid="start"
      class="flex flex-col items-center gap-4 self-center rounded-lg p-8 text-center"
      onClick={() => props.onStart()}
    >
      <i class={`fa-solid ${props.def.icon} text-[4rem] text-main`} />
      <span class="text-[2rem] text-text">{props.def.name}</span>
      <span class="max-w-xl text-sub">{props.def.howToPlay}</span>
      <Show when={!isTouch()} fallback={<span class="text-sm text-sub">tap to start</span>}>
        <span class="text-sm text-sub">
          press <kbd>enter</kbd> or click to start
        </span>
      </Show>
    </button>
  );
}
