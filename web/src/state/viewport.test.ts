import { describe, expect, it } from "vitest";
import { keyboardInset } from "./viewport";

describe("keyboardInset", () => {
  it("is what the keyboard covers of the page", () => {
    // iOS Safari: the page keeps its height, the visible part shrinks
    expect(keyboardInset(844, 508, 0)).toBe(336);
    // scrolled while the keyboard is up: the visible part moved down
    expect(keyboardInset(844, 508, 120)).toBe(216);
    // Chrome on Android resizes the page itself: nothing covered
    expect(keyboardInset(508, 508, 0)).toBe(0);
    // never negative (zoomed in, rounding)
    expect(keyboardInset(844, 850.4, 0)).toBe(0);
  });
});
