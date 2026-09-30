import { describe, expect, test } from "vitest";
import { calendarDays } from "./calendar";

describe("activity calendar", () => {
  test("weeks end on today, Monday on top, shaded by the busiest day", () => {
    // 2026-09-29 is a Tuesday: the last column has Monday and Tuesday
    const days = calendarDays(
      [
        { day: "2026-09-29", runs: 8 },
        { day: "2026-09-28", runs: 2 },
        { day: "2026-09-21", runs: 1 },
      ],
      "2026-09-29",
      2,
    );
    expect(days).toHaveLength(9);
    expect(days[0]).toMatchObject({ day: "2026-09-21", week: 0, weekday: 0, runs: 1, level: 1 });
    expect(days.at(-2)).toMatchObject({ day: "2026-09-28", week: 1, weekday: 0, level: 1 });
    expect(days.at(-1)).toMatchObject({ day: "2026-09-29", week: 1, weekday: 1, runs: 8, level: 4 });
    expect(days[3]).toMatchObject({ day: "2026-09-24", runs: 0, level: 0 });
  });

  test("no activity: every day blank", () => {
    expect(calendarDays([], "2026-09-29", 1).every((d) => d.level === 0)).toBe(true);
  });
});
