import { describe, expect, test } from "vitest";
import { averageByCategory, formatMs, summarize } from "./stats";

describe("run stats", () => {
  test("summarize finds the 3 fastest and slowest, the average, the median and the spread", () => {
    expect(summarize([])).toBeNull();
    expect(summarize([500, 100, 900, 300, 700])).toEqual({
      fastest: [100, 300, 500],
      slowest: [900, 700, 500],
      average: 500,
      median: 500,
      // √((0² + 400² + 400² + 200² + 200²) / 5)
      spread: Math.sqrt(80_000),
    });
    expect(summarize([400, 100])).toEqual({ fastest: [100, 400], slowest: [400, 100], average: 250, median: 250, spread: 150 });
  });

  test("averages are per category, in the given order, skipping empty ones", () => {
    const items = [
      { ms: 1000, label: "a", category: "+" },
      { ms: 3000, label: "b", category: "×" },
      { ms: 2000, label: "c", category: "+" },
    ];
    expect(averageByCategory(items, ["+", "−", "×"])).toEqual([
      { category: "+", average: 1500, count: 2 },
      { category: "×", average: 3000, count: 1 },
    ]);
  });

  test("times read as seconds, or milliseconds when precise", () => {
    expect(formatMs(1440)).toBe("1.4s");
    expect(formatMs(240, true)).toBe("240 ms");
    expect(formatMs(1240, true)).toBe("1.2s");
  });
});
