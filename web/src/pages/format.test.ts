import { describe, expect, test } from "vitest";
import { formatDay, formatDuration, formatScore, timeAgo } from "./format";

describe("profile formatting", () => {
  test("scores carry the test's unit and at most two decimals", () => {
    expect(formatScore("typing", 87.4)).toBe("87.4 wpm");
    expect(formatScore("reaction", 231.456)).toBe("231.46 ms");
    expect(formatScore("chess", 12)).toBe("12");
    expect(formatScore("number_memory", 9)).toBe("level 9");
    expect(formatScore("sequence_memory", 7)).toBe("level 7");
    expect(formatScore("pattern_memory", 5)).toBe("level 5");
    expect(formatScore("verbal_memory", 12)).toBe("12 points");
    expect(formatScore("maths", 12)).toBe("12 correct");
    expect(formatScore("unjumble", 17)).toBe("17 solved");
  });

  test("times are shown relative to now", () => {
    const now = Date.parse("2026-09-27T12:00:00Z");
    expect(timeAgo("2026-09-27T11:59:30Z", now)).toBe("just now");
    expect(timeAgo("2026-09-27T11:15:00Z", now)).toBe("45m ago");
    expect(timeAgo("2026-09-27T07:00:00Z", now)).toBe("5h ago");
    expect(timeAgo("2026-09-24T12:00:00Z", now)).toBe("3d ago");
  });

  test("days name their month, so they can't be misread", () => {
    expect(formatDay("2026-09-29T12:00:00Z")).toMatch(/Sep/);
    expect(formatDay("2026-09-29T12:00:00Z")).toMatch(/2026/);
  });

  test("time played reads in the largest units", () => {
    expect(formatDuration(45_000)).toBe("45s");
    expect(formatDuration(12 * 60_000 + 5_000)).toBe("12m");
    expect(formatDuration((3 * 60 + 12) * 60_000)).toBe("3h 12m");
  });
});
