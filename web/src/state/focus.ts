import { createSignal } from "solid-js";

// While a test is being played, the header and footer fade out (Monkeytype's focus mode)
// and notifications wait (`playing`). Moving the mouse brings the header back, but the
// player is still playing. Movement adds up, so a slow move towards the menu counts too
// (a nudge of the desk doesn't).
const [focused, setFocused] = createSignal(false);
const [playing, setPlaying] = createSignal(false);

export { focused, playing };

/** How far the mouse has moved (in pixels) since focus mode began. */
let moved = 0;
const REVEAL_AFTER_PX = 12;

export function startFocus(): void {
  moved = 0;
  setFocused(true);
  setPlaying(true);
}

export function endFocus(): void {
  setFocused(false);
  setPlaying(false);
}

window.addEventListener("mousemove", (e) => {
  if (!focused()) return;
  moved += Math.abs(e.movementX) + Math.abs(e.movementY);
  if (moved > REVEAL_AFTER_PX) setFocused(false);
});
