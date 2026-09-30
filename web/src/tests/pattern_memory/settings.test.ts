import { describe, expect, test } from "vitest";
import { patternMemorySettings } from "./settings";

const { isValid, bar } = patternMemorySettings;

describe("pattern memory settings", () => {
  test("ranked starts at level 1; practice at 1-20", () => {
    expect(isValid({ start_level: 1 }, "ranked")).toBe(true);
    expect(isValid({ start_level: 5 }, "ranked")).toBe(false);
    expect(isValid({ start_level: 20 }, "practice")).toBe(true);
    for (const bad of [{ start_level: 0 }, { start_level: 21 }, { start_level: 1.5 }, { start_level: 1, extra: 1 }, {}]) {
      expect(isValid(bad, "practice"), JSON.stringify(bad)).toBe(false);
    }
  });

  test("ranked shows its start; practice offers presets and a custom level", () => {
    expect(bar({ start_level: 1 }, "ranked")).toEqual([[{ kind: "note", label: "start level 1" }]]);
    const controls = bar({ start_level: 7 }, "practice")[0];
    expect(controls.map((c) => c.label)).toEqual(["start level", "1", "5", "10", "7"]);
    expect(controls[4]).toMatchObject({ kind: "custom", active: true, prompt: { inputs: [{ min: 1, max: 20, value: 7 }] } });
  });
});
