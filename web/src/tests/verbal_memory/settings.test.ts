import { describe, expect, test } from "vitest";
import { verbalMemorySettings } from "./settings";

const { isValid, bar } = verbalMemorySettings;

describe("verbal memory settings", () => {
  test("ranked has three lives; practice 1-5", () => {
    expect(isValid({ lives: 3 }, "ranked")).toBe(true);
    expect(isValid({ lives: 1 }, "ranked")).toBe(false);
    expect(isValid({ lives: 5 }, "practice")).toBe(true);
    for (const bad of [{ lives: 0 }, { lives: 6 }, { lives: 2.5 }, { lives: 3, extra: 1 }, {}]) {
      expect(isValid(bad, "practice"), JSON.stringify(bad)).toBe(false);
    }
  });

  test("ranked shows its lives; practice offers each count", () => {
    expect(bar({ lives: 3 }, "ranked")).toEqual([[{ kind: "note", label: "3 lives" }]]);
    const controls = bar({ lives: 1 }, "practice")[0];
    expect(controls.map((c) => c.label)).toEqual(["lives", "1", "2", "3", "4", "5"]);
    expect(controls[1]).toMatchObject({ active: true });
  });
});
