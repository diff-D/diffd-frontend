import { useNavigate } from "@solidjs/router";
import { Show } from "solid-js";
import { isTouch } from "../../state/device";

/**
 * A phone's way out of a game while it's played (its bars are away, and there's no Tab +
 * Enter): leave, or start again. Top left, clear of the notch.
 */
export default function GameBar(props: { restart: () => void }) {
  const navigate = useNavigate();
  return (
    <Show when={isTouch()}>
      <div data-testid="game-bar" class="fixed top-[max(0.5rem,env(safe-area-inset-top))] left-[max(0.5rem,env(safe-area-inset-left))] z-40 flex gap-1">
        <button type="button" class="btn-text" aria-label="leave the test" onClick={() => navigate("/")}>
          <i class="fa-solid fa-xmark" />
        </button>
        <button type="button" class="btn-text" aria-label="start again" onClick={() => props.restart()}>
          <i class="fa-solid fa-rotate-right" />
        </button>
      </div>
    </Show>
  );
}
