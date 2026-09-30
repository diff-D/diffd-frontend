import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import AnswerInput from "../shell/AnswerInput";
import SkipButton from "../shell/SkipButton";
import { Bump, createFeedback } from "../shell/feedback";
import { useRemote } from "../shell/remote";
import type { PlayProps } from "../shell/types";
import { teaWords } from "./dictionary";
import { TeaJudge, examples, hasGroup, normalize, roundLimit } from "./logic";
import type { LiveMessage } from "../shell/live";
import type { TeaChallenge, TeaEvent, TeaLive, TeaSettings } from "./types";

const WRONG_MS = 600;
/** How long words for a missed group stay up. */
const HINT_MS = 3000;

/**
 * Every tea game: a group of three letters, and words that contain it. The rules in the
 * challenge decide the clock: one timer for the run (green, blue), a shrinking timer per
 * group with lives (black), or fixed rounds (red, yellow).
 */
export default function TeaPlay(props: PlayProps<TeaSettings, TeaChallenge>) {
  const live = props.live;
  const { rules } = props.challenge;
  // live, the server has the groups and the words, and judges them
  const groups = props.challenge.groups ?? [];
  const words = live ? new Set<string>() : teaWords();
  const judge = new TeaJudge((word) => words.has(word), rules.kind === "race" && rules.scattered);
  const t0 = performance.now();
  const events: TeaEvent[] = [];
  const [round, setRound] = createSignal(0);
  const [points, setPoints] = createSignal(0);
  const [lives, setLives] = createSignal(rules.kind === "survival" ? rules.lives : 0);
  const [found, setFound] = createSignal<string[]>([]);
  const [roundWords, setRoundWords] = createSignal<string[]>([]);
  const [guess, setGuess] = createSignal("");
  const [complaint, setComplaint] = createSignal("");
  /** The guess is a word already used this run: it can't count again. */
  const repeat = () => {
    const word = normalize(guess());
    return word !== "" && found().includes(word) ? word : undefined;
  };
  /** Words already used that contain this group: the ones it would be easy to send again. */
  const blocked = () => found().filter((word) => hasGroup(word, group(), rules.kind === "race" && rules.scattered));
  /** The last word that counted, and what it scored. */
  const [accepted, setAccepted] = createSignal<{ word: string; gained: number }>();
  const [now, setNow] = createSignal(0);
  /** After a group is missed, skipped or its round ends: words that would have worked. */
  const [hint, setHint] = createSignal<{ group: string; text: string }>();
  let hintTimer: number | undefined;
  /** Black tea: when the current group appeared. */
  let started = 0;
  let flash: number | undefined;
  let finished = false;
  const feedback = createFeedback();

  /** Live: the group on screen, when its time (the run's, the group's, the round's) ends
   * (`performance.now()` time), and how long it had. */
  const [liveGroup, setLiveGroup] = createSignal("");
  const [endsAt, setEndsAt] = createSignal(0);
  let limit = 1;
  const group = () => (live ? liveGroup() : groups[Math.min(round(), groups.length - 1)]);

  /** Times the guess was cleared: tells a phone to clear its box too. */
  const [clears, setClears] = createSignal(0);
  function clearGuess() {
    setGuess("");
    setClears((n) => n + 1);
  }

  function end() {
    if (finished) return;
    finished = true;
    window.clearInterval(clock);
    props.finish(events);
  }

  /** Moves the clock to `t`: groups that ran out (black) or rounds that ended (red, yellow). */
  function advance(t: number) {
    if (rules.kind === "survival") {
      while (!finished && t > started + roundLimit(rules, round())) {
        started += roundLimit(rules, round());
        teach(group());
        // a half-typed word was for the group that ran out
        clearGuess();
        setRound((r) => r + 1);
        setLives((n) => n - 1);
        complain("too slow");
        if (lives() === 0 || round() === groups.length) end();
      }
    } else if (rules.kind === "race") {
      if (t >= rules.time_s * 1000) end();
    } else {
      const next = Math.floor(t / rules.round_ms);
      if (next >= rules.rounds) end();
      else if (next !== round()) {
        teach(group(), rules.count === "longest");
        clearGuess();
        setRound(next);
        setRoundWords([]);
      }
    }
  }

  const clock = window.setInterval(() => {
    const t = performance.now() - t0;
    setNow(t);
    // live, the server keeps the clocks
    if (!live) advance(t);
  }, 100);

  /** Live: what the server says. */
  function heard(message: LiveMessage) {
    const m = message as TeaLive;
    switch (m.type) {
      case "group":
        if (m.round !== round() || liveGroup() === "") setRoundWords([]);
        setRound(m.round);
        setLiveGroup(m.group);
        limit = Math.max(1, m.ends_in_ms);
        setEndsAt(live!.deadline(m.at_ms, m.ends_in_ms));
        setLives(m.lives);
        return;
      case "accepted":
        clearGuess();
        feedback.good();
        setFound((list) => [m.word, ...list]);
        setRoundWords((list) => [m.word, ...list]);
        setPoints(m.points);
        setAccepted({ word: m.word, gained: m.gained });
        props.progress?.(points());
        return;
      case "rejected": {
        const scattered = rules.kind === "race" && rules.scattered;
        complain(
          m.why === "no_group" ? (scattered ? `needs ${[...group()].join(" · ")} in order` : `needs “${group()}”`) : m.why === "used" ? "already used" : "not a word",
        );
        return;
      }
      case "missed": {
        const scattered = rules.kind === "race" && rules.scattered;
        if (m.examples.length > 0) {
          const shown = scattered ? [...m.group].join(" · ") : m.group;
          setHint({ group: shown, text: m.longest ? `longest: ${m.examples[0]}` : `e.g. ${m.examples.join(", ")}` });
          window.clearTimeout(hintTimer);
          hintTimer = window.setTimeout(() => setHint(undefined), HINT_MS);
        }
        clearGuess();
        if (rules.kind === "survival") {
          setLives(m.lives);
          complain("too slow");
        }
        return;
      }
      case "over":
        end();
    }
  }
  if (live) onCleanup(live.onMessage(heard));

  /** Shows what `group` could have been answered with (red: its longest word). */
  function teach(group: string, longest = false) {
    const scattered = rules.kind === "race" && rules.scattered;
    const found = examples(words, group, scattered, longest ? "long" : "short", longest ? 1 : 3);
    if (found.length === 0) return;
    const shown = scattered ? [...group].join(" · ") : group;
    setHint({ group: shown, text: longest ? `longest: ${found[0]}` : `e.g. ${found.join(", ")}` });
    window.clearTimeout(hintTimer);
    hintTimer = window.setTimeout(() => setHint(undefined), HINT_MS);
  }

  function complain(text: string) {
    feedback.bad();
    setComplaint(text);
    window.clearTimeout(flash);
    flash = window.setTimeout(() => setComplaint(""), WRONG_MS);
  }

  /** Why a guess didn't count, in a few words. */
  function reason(word: string): string {
    const scattered = rules.kind === "race" && rules.scattered;
    if (!hasGroup(word, group(), scattered)) return scattered ? `needs ${[...group()].join(" · ")} in order` : `needs “${group()}”`;
    if (judge.used.has(word)) return "already used";
    return "not a word";
  }

  function onEnter(e: KeyboardEvent, input: HTMLInputElement) {
    // a word that didn't count stays, selected, to be fixed
    if (submit(e.shiftKey) === "rejected") input.select();
  }

  /** Enter (or Shift+Enter, `skip`) here or on a phone: tries the guess, or skips (green, blue). */
  function submit(skip: boolean): "done" | "rejected" {
    if (finished) return "done";
    if (live) {
      if (skip && rules.kind === "race") live.send({ type: "skip", index: round() });
      else if (!skip && normalize(guess()) !== "") live.send({ type: "enter", value: guess(), index: round() });
      return "done";
    }
    const t = performance.now() - t0;
    advance(t);
    if (finished) return "done";
    if (skip && rules.kind === "race") {
      teach(group());
      events.push({ t_ms: t, skip: true });
      clearGuess();
      setRound((r) => r + 1);
      if (round() === groups.length) end();
      return "done";
    }
    if (normalize(guess()) === "") return "done";
    events.push({ t_ms: t, word: guess() });
    const word = judge.accept(guess(), group());
    if (word === null) {
      complain(reason(normalize(guess())));
      return "rejected";
    }
    clearGuess();
    feedback.good();
    const before = points();
    setFound((list) => [word, ...list]);
    if (rules.kind === "rounds") {
      setRoundWords((list) => [word, ...list]);
      if (rules.count === "most") setPoints((n) => n + 1);
      else {
        // red: only the longest word of each round counts
        const best = (list: string[]) => Math.max(0, ...list.map((w) => [...w].length));
        const before = best(roundWords().slice(1));
        setPoints((n) => n + Math.max(0, best(roundWords()) - before));
      }
    } else {
      setPoints((n) => n + 1);
      started = t;
      setRound((r) => r + 1);
      if (round() === groups.length) end();
    }
    setAccepted({ word, gained: points() - before });
    props.progress?.(points());
    return "done";
  }

  // a phone types the words on its own keyboard
  useRemote(
    props.remote,
    () => ({
      kind: "text",
      prompt: shownGroup(),
      clear: clears(),
      enter: "enter",
      skip: rules.kind === "race" ? "skip" : undefined,
      note: complaint() || undefined,
      verdict: feedback.shown(),
      index: round(),
    }),
    (action) => {
      // live, the phone gave its word to the server itself (the verdict comes from there)
      if (action.type === "live") return;
      if (action.type === "text") setGuess(action.value.slice(0, 32));
      else if (action.type === "enter") submit(false);
      else if (action.type === "skip") submit(true);
    },
    live,
  );

  onMount(() => {
    props.started();
    live?.begin();
  });
  onCleanup(() => {
    window.clearInterval(clock);
    window.clearTimeout(flash);
    window.clearTimeout(hintTimer);
  });

  /** Seconds left: of the run, the group (black) or the round. */
  const left = () => {
    if (live) return Math.max(0, Math.ceil((endsAt() - t0 - now()) / 1000));
    const t = now();
    if (rules.kind === "race") return Math.max(0, Math.ceil(rules.time_s - t / 1000));
    if (rules.kind === "rounds") return Math.max(0, Math.ceil(((round() + 1) * rules.round_ms - t) / 1000));
    return Math.max(0, Math.ceil((started + roundLimit(rules, round()) - t) / 1000));
  };
  /** Black: how much of the group's time is left, for the bar. */
  const share = () => {
    if (rules.kind !== "survival") return 0;
    if (live) return Math.max(0, (endsAt() - t0 - now()) / limit);
    return Math.max(0, (started + roundLimit(rules, round()) - now()) / roundLimit(rules, round()));
  };
  const shownGroup = () => (rules.kind === "race" && rules.scattered ? [...group()].join(" · ") : group());

  return (
    <div class="flex flex-col items-center gap-6 text-center">
      <div class="flex w-full max-w-xl items-end justify-between">
        <span data-testid="tea-clock" class="text-[2rem] leading-none text-main">
          {left()}
        </span>
        <span class="flex items-center gap-4 text-sub">
          <Show when={rules.kind === "survival" && rules}>
            {(survival) => (
              <span aria-label={`${lives()} lives`} class="flex gap-1">
                <For each={Array.from({ length: survival().lives }, (_, i) => i)}>
                  {(i) => <i class={`fa-solid fa-heart ${i < lives() ? "text-main" : "text-sub"}`} />}
                </For>
              </span>
            )}
          </Show>
          <Show when={rules.kind === "rounds" && rules}>
            {(rounds) => (
              <span data-testid="tea-round">
                round {round() + 1}/{rounds().rounds}
              </span>
            )}
          </Show>
          <span>
            score{" "}
            <Bump testId="tea-points" class="text-main" value={points()} />
          </span>
        </span>
      </div>
      <Show when={rules.kind === "survival"}>
        <div class="h-1 w-full max-w-xl overflow-hidden rounded bg-sub-alt">
          <div class="h-full bg-main" style={{ width: `${share() * 100}%` }} />
        </div>
      </Show>
      <span
        data-testid="tea-group"
        class={`text-[4rem] leading-none tracking-[0.25em] transition-colors ${
          complaint() ? "text-error" : feedback.verdict() === "good" ? "text-main" : "text-text"
        }`}
      >
        {shownGroup()}
      </span>
      <AnswerInput
        label="your word"
        value={guess()}
        onInput={setGuess}
        onEnter={onEnter}
        error={complaint() !== "" || repeat() !== undefined}
        feedback={feedback}
        maxLength={32}
        width="max-w-md"
        class="text-center text-[2rem]"
      />
      <Show when={rules.kind === "race"}>
        <SkipButton onSkip={() => submit(true)} />
      </Show>
      <span class="h-6" aria-live="polite">
        <Show
          when={complaint() || (repeat() && "already used: try another")}
          fallback={
            <Show when={accepted()}>
              {(last) => (
                <span data-testid="tea-accepted" class="text-main">
                  <i class="fa-solid fa-check" /> {last().word}
                  <Show when={last().gained > 0}>
                    <span class="text-sub"> +{last().gained}</span>
                  </Show>
                </span>
              )}
            </Show>
          }
        >
          {(text) => (
            <span data-testid="tea-complaint" class="text-error">
              <i class="fa-solid fa-xmark" /> {text()}
            </span>
          )}
        </Show>
      </span>
      <span data-testid="tea-hint" class="h-6 text-sm text-sub" aria-live="polite">
        <Show when={hint()}>
          {(h) => (
            <>
              <span class="text-main">{h().group}</span> {h().text}
            </>
          )}
        </Show>
      </span>
      {/* words used already that fit this group too: they can't count again */}
      <Show when={blocked().length > 0}>
        <section class="flex w-full max-w-xl flex-col items-center gap-2">
          <span class="text-xs text-sub">already used for {shownGroup()}</span>
          <ul data-testid="tea-words" class="flex flex-wrap justify-center gap-2">
            <For each={blocked()}>
              {(word) => (
                <li class={`rounded bg-sub-alt px-2 py-1 text-sm ${word === repeat() ? "text-error ring-1 ring-error" : "text-text"}`}>{word}</li>
              )}
            </For>
          </ul>
        </section>
      </Show>
    </div>
  );
}
