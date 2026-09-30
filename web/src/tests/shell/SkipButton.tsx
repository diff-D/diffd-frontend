import { Show } from "solid-js";
import { isTouch } from "../../state/device";

/** Skip, for a touch screen, whose keyboard has no Shift+Enter; the keyboard stays open. */
export default function SkipButton(props: { onSkip: () => void }) {
  return (
    <Show when={isTouch()}>
      <button
        type="button"
        class="btn"
        onPointerDown={(e) => {
          // keep the focus (and the keyboard) in the answer box
          e.preventDefault();
          if (e.button === 0) props.onSkip();
        }}
        onClick={(e) => e.detail === 0 && props.onSkip()}
      >
        skip
      </button>
    </Show>
  );
}
