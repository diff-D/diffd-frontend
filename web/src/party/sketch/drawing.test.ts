import { describe, expect, it } from "vitest";
import { MAX_NUMBERS, applyOps, createBatcher, floodFill, hex, stepsFor, toDrawing } from "./drawing";

describe("applyOps", () => {
  it("draws lines and fills, adds to the last line, undoes and clears", () => {
    const marks = applyOps([], [
      { k: "line", c: 2, w: 6, p: [1, 2] },
      { k: "more", p: [3, 4] },
      { k: "fill", c: 0xff0000, x: 5, y: 5 },
      { k: "more", p: [9, 9] },
      { k: "line", c: 0, w: 3, p: [5, 6] },
    ]);
    expect(marks).toEqual([
      { k: "line", c: 2, w: 6, p: [1, 2, 3, 4] },
      { k: "fill", c: 0xff0000, x: 5, y: 5 },
      { k: "line", c: 0, w: 3, p: [5, 6] },
    ]);
    applyOps(marks, [{ k: "undo" }]);
    expect(marks).toHaveLength(2);
    applyOps(marks, [{ k: "clear" }, { k: "more", p: [1, 1] }]);
    expect(marks).toEqual([]);
  });
});

describe("stepsFor", () => {
  it("draws a mark again in steps small enough to send", () => {
    const p = Array.from({ length: 250 }, (_, i) => i);
    const steps = stepsFor({ k: "line", c: 1, w: 3, p });
    expect(steps.map((s) => s.k)).toEqual(["line", "more", "more"]);
    expect(applyOps([], steps)).toEqual([{ k: "line", c: 1, w: 3, p }]);
    expect(stepsFor({ k: "fill", c: 1, x: 2, y: 3 })).toEqual([{ k: "fill", c: 1, x: 2, y: 3 }]);
  });
});

describe("floodFill", () => {
  /** A white 5×5 picture with a black wall down column 2. */
  const picture = () => {
    const pixels = new Uint8ClampedArray(5 * 5 * 4).fill(255);
    for (let y = 0; y < 5; y++) pixels.fill(0, (y * 5 + 2) * 4, (y * 5 + 2) * 4 + 3);
    return pixels;
  };
  const colourAt = (pixels: Uint8ClampedArray, x: number, y: number) => {
    const i = (y * 5 + x) * 4;
    return (pixels[i] << 16) | (pixels[i + 1] << 8) | pixels[i + 2];
  };

  it("fills the area around the point up to the lines, and no further", () => {
    const pixels = picture();
    floodFill(pixels, 5, 5, 0, 0, 0xff0000);
    expect(colourAt(pixels, 0, 4)).toBe(0xff0000);
    expect(colourAt(pixels, 1, 2)).toBe(0xff0000);
    expect(colourAt(pixels, 3, 0)).toBe(0xffffff);
    // the wall stays, and stops it
    expect(colourAt(pixels, 2, 2)).toBe(0x000000);
    expect(colourAt(pixels, 4, 4)).toBe(0xffffff);
  });

  it("does nothing over the same colour", () => {
    const pixels = picture();
    floodFill(pixels, 5, 5, 4, 4, 0xffffff);
    expect(pixels).toEqual(picture());
  });
});

describe("createBatcher", () => {
  it("joins points into the line being drawn and keeps batches within the party's limits", () => {
    const batcher = createBatcher();
    batcher.add({ k: "line", c: 0, w: 3, p: [0, 0] });
    for (let i = 0; i < 400; i++) batcher.add({ k: "more", p: [i, i] });
    for (let i = 0; i < 7; i++) batcher.add({ k: "fill", c: 0, x: 1, y: 1 });
    const sizes: number[] = [];
    while (batcher.waiting()) {
      const batch = batcher.take();
      sizes.push(batch.reduce((n, op) => n + ("p" in op ? op.p.length : op.k === "fill" ? 100 : 0), 0));
    }
    expect(sizes.reduce((a, b) => a + b)).toBe(802 + 700);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(MAX_NUMBERS);
  });
});

describe("hex and toDrawing", () => {
  it("writes colours and scales points to the drawing", () => {
    expect(hex(0x00acc1)).toBe("#00acc1");
    const box = { left: 10, top: 10, width: 400, height: 300 };
    expect(toDrawing(210, 160, box)).toEqual([400, 300]);
    expect(toDrawing(0, 999, box)).toEqual([0, 600]);
  });
});
