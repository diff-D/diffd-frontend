import { describe, expect, test } from "vitest";
import { niceScale, smoothPath } from "./chart";

describe("niceScale", () => {
  test("round steps, and a top at or above the highest value", () => {
    expect(niceScale(87)).toEqual({ step: 25, top: 100 });
    expect(niceScale(130)).toEqual({ step: 50, top: 150 });
    expect(niceScale(3)).toEqual({ step: 1, top: 3 });
    expect(niceScale(0)).toEqual({ step: 1, top: 1 });
    // error counts: whole steps only
    expect(niceScale(10)).toEqual({ step: 5, top: 10 });
  });
});

describe("smoothPath", () => {
  test("goes through every point", () => {
    const path = smoothPath([
      { x: 0, y: 10 },
      { x: 10, y: 0 },
      { x: 20, y: 10 },
    ]);
    expect(path.startsWith("M0,10")).toBe(true);
    expect(path).toContain(" 10,0 C");
    expect(path.endsWith(" 20,10")).toBe(true);
  });

  test("a flat stretch stays flat, so control points never leave it", () => {
    const path = smoothPath([
      { x: 0, y: 5 },
      { x: 10, y: 5 },
      { x: 20, y: 5 },
    ]);
    const ys = [...path.matchAll(/[\d.]+,([\d.-]+)/g)].map((m) => Number(m[1]));
    expect(ys.every((y) => y === 5)).toBe(true);
  });

  test("control points stay between their neighbours (no overshoot)", () => {
    const points = [
      { x: 0, y: 40 },
      { x: 10, y: 0 },
      { x: 20, y: 38 },
      { x: 30, y: 39 },
    ];
    const ys = [...smoothPath(points).matchAll(/[\d.]+,([\d.-]+)/g)].map((m) => Number(m[1]));
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...ys)).toBeLessThanOrEqual(40);
  });

  test("one point or none", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([{ x: 3, y: 4 }])).toBe("M3,4");
  });
});
