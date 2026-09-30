/**
 * A phone or tablet: a touch screen with no mouse to hover with. It has no use for a
 * remote, and gets buttons for what its keyboard can't do (skip).
 */
export function isTouch(): boolean {
  return typeof matchMedia === "function" && matchMedia("(pointer: coarse) and (hover: none)").matches;
}

