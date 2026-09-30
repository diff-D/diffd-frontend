import { describe, expect, test } from "vitest";
import { reactionSettings } from "./settings";

const { isValid, bar } = reactionSettings;

describe("reaction settings", () => {
  test("ranked is always 5 rounds; practice 1-20", () => {
    expect(isValid({ rounds: 5 }, "ranked")).toBe(true);
    expect(isValid({ rounds: 3 }, "ranked")).toBe(false);
    expect(isValid({ rounds: 20 }, "practice")).toBe(true);
    for (const bad of [{ rounds: 0 }, { rounds: 21 }, { rounds: "5" }, { rounds: 5, extra: 1 }, {}]) {
      expect(isValid(bad, "practice"), JSON.stringify(bad)).toBe(false);
    }
  });

  test("ranked shows its fixed rounds; practice offers presets and a custom count", () => {
    expect(bar({ rounds: 5 }, "ranked")).toEqual([[{ kind: "note", label: "5 rounds" }]]);
    const controls = bar({ rounds: 7 }, "practice")[0];
    expect(controls.map((c) => c.label)).toEqual(["rounds", "1", "3", "5", "10", "7"]);
    expect(controls[5]).toMatchObject({ kind: "custom", active: true, prompt: { inputs: [{ min: 1, max: 20, value: 7 }] } });
  });
});
