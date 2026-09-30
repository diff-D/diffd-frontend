import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  type TestSettings,
  clamp,
  customNumber,
  NO_SETTINGS,
  hasExactly,
  isInt,
  isRecord,
  loadSettings,
  note,
  option,
  saveSettings,
} from "./settings";

type Demo = { n: number };

const demo: TestSettings<Demo> = {
  defaults: { ranked: { n: 5 }, practice: { n: 1 } },
  isValid: (value, mode): value is Demo =>
    isRecord(value) && hasExactly(value, ["n"]) && isInt(value.n, 1, mode === "ranked" ? 5 : 20),
  bar: () => [],
};

function fakeStorage() {
  const items = new Map<string, string>();
  return {
    items,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe("remembered settings", () => {
  let storage: ReturnType<typeof fakeStorage>;
  beforeEach(() => {
    storage = fakeStorage();
    vi.stubGlobal("localStorage", storage);
  });
  afterEach(() => vi.unstubAllGlobals());

  test("with nothing saved: ranked, with the defaults", () => {
    expect(loadSettings("demo", demo)).toEqual({ mode: "ranked", ranked: { n: 5 }, practice: { n: 1 } });
  });

  test("saved settings come back", () => {
    saveSettings("demo", { mode: "practice", ranked: { n: 5 }, practice: { n: 17 } });
    expect(storage.items.has("diffd-settings-demo")).toBe(true);
    expect(loadSettings("demo", demo)).toEqual({ mode: "practice", ranked: { n: 5 }, practice: { n: 17 } });
  });

  test("invalid saved values fall back to that mode's defaults", () => {
    storage.setItem("diffd-settings-demo", JSON.stringify({ mode: "sideways", ranked: { n: 9 }, practice: { n: 3, extra: true } }));
    expect(loadSettings("demo", demo)).toEqual({ mode: "ranked", ranked: { n: 5 }, practice: { n: 1 } });
    storage.setItem("diffd-settings-demo", "{not json");
    expect(loadSettings("demo", demo)).toEqual({ mode: "ranked", ranked: { n: 5 }, practice: { n: 1 } });
  });

  test("storage that throws is ignored", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    });
    expect(loadSettings("demo", demo).ranked).toEqual({ n: 5 });
    expect(() => saveSettings("demo", { mode: "ranked", ranked: { n: 5 }, practice: { n: 1 } })).not.toThrow();
  });
});

describe("value checks", () => {
  test("isInt, clamp and hasExactly", () => {
    expect(isInt(3, 1, 5)).toBe(true);
    expect(isInt(3.5, 1, 5)).toBe(false);
    expect(isInt("3", 1, 5)).toBe(false);
    expect(isInt(6, 1, 5)).toBe(false);
    expect(clamp(0, 1, 20)).toBe(1);
    expect(clamp(99, 1, 20)).toBe(20);
    expect(clamp(7.6, 1, 20)).toBe(8);
    expect(hasExactly({ a: 1, b: 2 }, ["a", "b"])).toBe(true);
    expect(hasExactly({ a: 1 }, ["a", "b"])).toBe(false);
    expect(hasExactly({ a: 1, c: 3 }, ["a"])).toBe(false);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });
});

describe("controls", () => {
  test("a test without options accepts only an empty object and has no bar", () => {
    expect(NO_SETTINGS.isValid({}, "ranked")).toBe(true);
    expect(NO_SETTINGS.isValid({ rounds: 5 }, "practice")).toBe(false);
    expect(NO_SETTINGS.bar({}, "practice")).toEqual([]);
  });

  test("an option carries the settings it switches to", () => {
    expect(option({ n: 1 }, "3", false, { n: 3 })).toEqual({ kind: "option", label: "3", active: false, next: { n: 3 } });
    expect(note("rounds")).toEqual({ kind: "note", label: "rounds" });
  });

  test("a custom number shows its value when it is not a preset", () => {
    const input = { title: "custom n", label: "n", min: 1, max: 20 };
    const custom = customNumber({ n: 7 }, 7, [1, 5], input, (n) => ({ n }));
    expect(custom).toMatchObject({ kind: "custom", label: "7", active: true });
    if (custom.kind !== "custom") throw new Error("not a custom control");
    expect(custom.prompt.inputs).toEqual([{ label: "n", min: 1, max: 20, value: 7 }]);
    expect(custom.prompt.apply([12])).toEqual({ n: 12 });
    expect(customNumber({ n: 5 }, 5, [1, 5], input, (n) => ({ n }))).toMatchObject({ label: "custom", active: false });
  });
});
