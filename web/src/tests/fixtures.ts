// Test helper: the shared scoring fixtures (the server runs them too).
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { expect } from "vitest";

export type Fixture = {
  file: string;
  description: string;
  challenge: unknown;
  events: unknown[];
  expected: { primary: number; score: unknown };
};

const DIR = resolve(__dirname, "../../../fixtures/scoring");

export function loadFixtures(test: string): Fixture[] {
  const files = readdirSync(DIR).filter((file) => file.startsWith(`${test}-`) && file.endsWith(".json"));
  expect(files.length, `fixtures for ${test}`).toBeGreaterThan(0);
  return files.sort().map((file) => ({ file, ...JSON.parse(readFileSync(resolve(DIR, file), "utf8")) }));
}

/** Deep equality where numbers only need to agree to 1e-6. */
export function expectClose(actual: unknown, expected: unknown, path = "score"): void {
  if (typeof expected === "number") {
    expect(typeof actual, path).toBe("number");
    expect(Math.abs((actual as number) - expected), `${path}: ${actual} vs ${expected}`).toBeLessThan(1e-6);
  } else if (Array.isArray(expected)) {
    expect(Array.isArray(actual), path).toBe(true);
    expect((actual as unknown[]).length, `${path}.length`).toBe(expected.length);
    expected.forEach((item, i) => expectClose((actual as unknown[])[i], item, `${path}[${i}]`));
  } else if (expected !== null && typeof expected === "object") {
    const keys = Object.keys(expected).sort();
    expect(Object.keys(actual as object).sort(), `${path} keys`).toEqual(keys);
    for (const key of keys) {
      expectClose((actual as Record<string, unknown>)[key], (expected as Record<string, unknown>)[key], `${path}.${key}`);
    }
  } else {
    expect(actual, path).toEqual(expected);
  }
}
