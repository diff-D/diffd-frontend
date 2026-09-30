import { createSignal } from "solid-js";
import { isTouch } from "./device";

// A phone's visible screen: its browser bars come and go (Safari's at the bottom, Chrome's
// at the top) and the on-screen keyboard covers the bottom of the page. CSS handles the bars
// (`dvh`, the safe areas); this module follows the keyboard.

/** How much of the page the on-screen keyboard covers, in pixels. Chrome on Android
 * shrinks the page for it (`interactive-widget=resizes-content`): nothing is covered there;
 * iOS Safari keeps the page and puts the keyboard over it. */
export function keyboardInset(innerHeight: number, visibleHeight: number, visibleTop: number): number {
  return Math.max(0, Math.round(innerHeight - visibleHeight - visibleTop));
}

const [typing, setTyping] = createSignal(false);

/** A phone's keyboard is up: a text box has the focus on a touch screen. */
export const keyboardOpen = (): boolean => typing() && isTouch();

const isField = (target: EventTarget | null): boolean =>
  target instanceof HTMLTextAreaElement ||
  (target instanceof HTMLInputElement && !["button", "checkbox", "radio", "range", "color", "submit", "reset", "file"].includes(target.type) && !target.readOnly) ||
  (target instanceof HTMLElement && target.isContentEditable);

/** Starts following the keyboard (once, at start-up). */
export function watchViewport(): void {
  const viewport = window.visualViewport;
  const update = () => {
    const cover = viewport ? keyboardInset(window.innerHeight, viewport.height, viewport.offsetTop) : 0;
    // what sits at the bottom (a sheet) rises above it: `var(--kb)`
    document.documentElement.style.setProperty("--kb", `${cover}px`);
  };
  viewport?.addEventListener("resize", update);
  viewport?.addEventListener("scroll", update);
  document.addEventListener("focusin", (e) => setTyping(isField(e.target)));
  document.addEventListener("focusout", () => setTyping(false));
  update();
}
