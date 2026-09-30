import { describe, expect, test } from "vitest";
import { mathsSettings } from "./settings";
import type { MathsSettings } from "./types";

const { isValid, bar } = mathsSettings;

describe("maths settings", () => {
  test("ranked is 60 s of medium problems with all their operations", () => {
    expect(isValid({ time_s: 60, tier: "medium" }, "ranked")).toBe(true);
    expect(isValid({ time_s: 30, tier: "medium" }, "ranked")).toBe(false);
    expect(isValid({ time_s: 60, tier: "medium", operations: ["add"] }, "ranked")).toBe(false);
    expect(bar({ time_s: 60, tier: "medium" }, "ranked")).toEqual([[{ kind: "note", label: "60 s · medium" }]]);
  });

  test("practice operations are any non-empty choice of the four, in every tier", () => {
    expect(isValid({ time_s: 120, tier: "hard", operations: ["divide"] }, "practice")).toBe(true);
    expect(isValid({ time_s: 60, tier: "easy", operations: ["divide", "multiply"] }, "practice")).toBe(true);
    const bad = [
      { time_s: 45, tier: "easy" },
      { time_s: 60, tier: "insane" },
      { time_s: 60, tier: "easy", operations: ["modulo"] },
      { time_s: 60, tier: "easy", operations: [] },
      { time_s: 60, tier: "easy", operations: ["add", "add"] },
      { time_s: 60, tier: "easy", operations: "add" },
      { time_s: 60, tier: "easy", extra: 1 },
    ];
    for (const value of bad) expect(isValid(value, "practice"), JSON.stringify(value)).toBe(false);
  });

  test("operation toggles keep one on and drop the list when all four are on", () => {
    // after the group's title
    const operations = (s: MathsSettings) => bar(s, "practice")[2].slice(1);
    expect(operations({ time_s: 60, tier: "easy" }).map((c) => c.label)).toEqual(["+", "−", "×", "÷"]);
    expect(operations({ time_s: 60, tier: "easy" })[0]).toEqual({
      kind: "option",
      label: "+",
      active: true,
      next: { time_s: 60, tier: "easy", operations: ["subtract", "multiply", "divide"] },
    });
    const onlyDivide: MathsSettings = { time_s: 60, tier: "easy", operations: ["divide"] };
    expect(operations(onlyDivide)[3]).toMatchObject({ active: true, next: onlyDivide });
    expect(operations(onlyDivide)[0]).toEqual({
      kind: "option",
      label: "+",
      active: false,
      next: { time_s: 60, tier: "easy", operations: ["add", "divide"] },
    });
    const allButOne: MathsSettings = { time_s: 60, tier: "easy", operations: ["add", "subtract", "multiply"] };
    expect(operations(allButOne)[3]).toEqual({ kind: "option", label: "÷", active: false, next: { time_s: 60, tier: "easy" } });
  });

  test("changing the tier keeps the chosen operations", () => {
    const tiers = bar({ time_s: 30, tier: "easy", operations: ["divide"] }, "practice")[1].slice(1);
    expect(tiers.map((c) => c.label)).toEqual(["easy", "medium", "hard"]);
    expect(tiers[2]).toEqual({ kind: "option", label: "hard", active: false, next: { time_s: 30, tier: "hard", operations: ["divide"] } });
  });
});
