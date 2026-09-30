import { describe, expect, test } from "vitest";
import { expectClose, loadFixtures } from "../fixtures";
import { TypingModel, keyFromEvent, parseKey, scoreTyping, speedTimeline, wordView } from "./logic";
import type { TypingChallenge, TypingEvent } from "./types";

const noModifiers = { ctrlKey: false, metaKey: false, altKey: false };

describe("typing scoring", () => {
  for (const fixture of loadFixtures("typing")) {
    test(`matches the shared fixture ${fixture.file}`, () => {
      const score = scoreTyping(fixture.challenge as TypingChallenge, fixture.events as TypingEvent[]);
      expectClose(score, fixture.expected.score);
      expectClose(score.wpm, fixture.expected.primary, "primary");
    });
  }

  test("an unfinished words test cannot be scored", () => {
    const challenge: TypingChallenge = { mode: "words", limit: 1, words: ["hi"] };
    expect(() => scoreTyping(challenge, [{ t_ms: 0, key: "h" }])).toThrow();
  });
});

describe("keys", () => {
  test("parseKey accepts the server's key names only", () => {
    expect(parseKey("Space")).toEqual({ kind: "space" });
    expect(parseKey("Backspace")).toEqual({ kind: "backspace" });
    expect(parseKey("a")).toEqual({ kind: "char", char: "a" });
    expect(parseKey(" ")).toBeNull();
    expect(parseKey("Enter")).toBeNull();
  });

  test("keyFromEvent ignores modifiers and non-character keys", () => {
    expect(keyFromEvent({ key: " ", ...noModifiers })).toEqual({ kind: "space" });
    expect(keyFromEvent({ key: "a", ...noModifiers })).toEqual({ kind: "char", char: "a" });
    expect(keyFromEvent({ key: "Backspace", ...noModifiers })).toEqual({ kind: "backspace" });
    expect(keyFromEvent({ key: "r", ...noModifiers, ctrlKey: true })).toBeNull();
    expect(keyFromEvent({ key: "l", ...noModifiers, metaKey: true })).toBeNull();
    expect(keyFromEvent({ key: "a", ...noModifiers, altKey: true })).toBeNull();
    for (const key of ["Tab", "Enter", "Shift", "ArrowLeft", "F5", "Escape"]) {
      expect(keyFromEvent({ key, ...noModifiers }), key).toBeNull();
    }
  });
});

describe("TypingModel and wordView", () => {
  const challenge: TypingChallenge = { mode: "time", limit: 30, words: ["cat", "dog"] };

  test("letters show correct, incorrect, extra and untyped", () => {
    const model = new TypingModel(challenge);
    for (const char of "cxtt") model.press({ kind: "char", char }, 0);
    const view = wordView(model, 0);
    expect(view.letters.map((l) => `${l.char}:${l.state}`)).toEqual([
      "c:correct",
      "a:incorrect",
      "t:correct",
      "t:extra",
    ]);
    expect(view.error).toBe(false);
    expect(wordView(model, 1).letters.every((l) => l.state === "untyped")).toBe(true);
  });

  test("a committed word with a mistake is marked as an error; backspace goes back into it", () => {
    const model = new TypingModel(challenge);
    model.press({ kind: "space" }, 0); // ignored: nothing typed yet
    for (const char of "ca") model.press({ kind: "char", char }, 0);
    model.press({ kind: "space" }, 0);
    expect(model.committed).toEqual([{ typed: "ca", spaced: true }]);
    expect(wordView(model, 0).error).toBe(true);
    model.press({ kind: "backspace" }, 0);
    expect(model.committed).toEqual([]);
    expect(model.current).toBe("ca");
  });

  test("backspace does not go back into a correct word", () => {
    const model = new TypingModel(challenge);
    for (const char of challenge.words[0]) model.press({ kind: "char", char }, 0);
    model.press({ kind: "space" }, 0);
    model.press({ kind: "backspace" }, 0);
    expect(model.committed.length).toBe(1);
    expect(model.current).toBe("");
  });
});

describe("speedTimeline", () => {
  test("each second has the speed so far, its raw speed and its wrong keys", () => {
    const challenge: TypingChallenge = { mode: "time", limit: 2, words: ["ab", "cd", "ef"] };
    // "ab " in the first second; "cx" (one wrong) in the second
    const events: TypingEvent[] = [
      { t_ms: 0, key: "a" },
      { t_ms: 300, key: "b" },
      { t_ms: 600, key: "Space" },
      { t_ms: 1200, key: "c" },
      { t_ms: 1500, key: "x" },
    ];
    expect(speedTimeline(challenge, events, 2)).toEqual([
      // 3 correct characters in 1 s: 36 wpm; 3 keys: 36 raw
      { second: 1, wpm: 36, raw: 36, errors: 0 },
      // "cx" isn't a right start of "cd", so still "ab " but over 2 s: 18 wpm; 2 keys: 24 raw
      { second: 2, wpm: 18, raw: 24, errors: 1 },
    ]);
  });

  test("a last part-second counts at its own length", () => {
    const challenge: TypingChallenge = { mode: "words", limit: 1, words: ["ab"] };
    const events: TypingEvent[] = [
      { t_ms: 0, key: "a" },
      { t_ms: 1500, key: "b" },
    ];
    const timeline = speedTimeline(challenge, events, 1.5);
    expect(timeline).toHaveLength(2);
    // "b" alone in half a second: 24 raw
    expect(timeline[1]).toEqual({ second: 2, wpm: 16, raw: 24, errors: 0 });
  });
});
