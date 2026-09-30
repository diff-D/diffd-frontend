import { describe, expect, test } from "vitest";
import { teaSettings } from "./settings";

describe("tea settings", () => {
  test("ranked is the standard game; practice takes each colour's own options", () => {
    const green = teaSettings("green_tea");
    expect(green.isValid({}, "ranked")).toBe(true);
    expect(green.isValid({ time_s: 30 }, "ranked")).toBe(false);
    expect(green.isValid({ time_s: 30 }, "practice")).toBe(true);
    expect(green.isValid({ time_s: 45 }, "practice")).toBe(false);
    expect(green.isValid({ time_s: 30, lives: 3 }, "practice")).toBe(false);
    expect(green.defaults.practice).toEqual({ time_s: 60 });
    const black = teaSettings("black_tea");
    expect(black.isValid({ lives: 5, start_s: 6 }, "practice")).toBe(true);
    expect(black.isValid({ lives: 5 }, "practice")).toBe(false);
  });

  test("the panel has a titled group per option", () => {
    const red = teaSettings("red_tea");
    expect(red.bar({}, "ranked")).toEqual([[{ kind: "note", label: "8 rounds · 12 s" }]]);
    const groups = red.bar({ rounds: 8, round_s: 12 }, "practice");
    expect(groups.map((group) => group[0].label)).toEqual(["rounds", "seconds per round"]);
    expect(groups[1][1]).toEqual({ kind: "option", label: "8", active: false, next: { rounds: 8, round_s: 8 } });
  });
});
