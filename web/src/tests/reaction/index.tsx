import { Match, Switch, createSignal, onCleanup, onMount } from "solid-js";
import { act } from "../../ui/touch";
import type { PlayProps } from "../shell/types";
import type { LiveMessage } from "../shell/live";
import type { ReactionChallenge, ReactionEvent, ReactionLive, ReactionSettings } from "./types";

type Phase = "idle" | "waiting" | "go" | "early" | "round-done";

const PANEL_COLOURS: Record<Phase, string> = {
  idle: "bg-sub-alt text-text",
  waiting: "bg-sub-alt text-sub",
  go: "bg-main text-bg",
  early: "bg-error text-bg",
  "round-done": "bg-sub-alt text-text",
};

/**
 * One big panel: wait for it to turn, then click (or press Space) as fast as you can. Played
 * live (`props.live`), the server says when to go, so the page never knows the delays; the
 * page times the click from the moment it showed "go".
 */
export default function ReactionPlay(props: PlayProps<ReactionSettings, ReactionChallenge>) {
  const live = props.live;
  const [phase, setPhase] = createSignal<Phase>("idle");
  const [rounds, setRounds] = createSignal<number[]>([]);
  const events: ReactionEvent[] = [];
  let startedAt: number | null = null;
  let attempt = 0;
  let goAt = 0;
  let timer: number | undefined;
  let finished = false;

  /** Milliseconds since the first round started. */
  function now(): number {
    const t = performance.now();
    if (startedAt === null) startedAt = t;
    return t - startedAt;
  }

  function press() {
    if (finished) return;
    if (live) return pressLive();
    const challenge = props.challenge;
    switch (phase()) {
      case "idle":
      case "round-done":
      case "early": {
        if (attempt >= challenge.delays_ms.length) {
          // out of delays after too many early clicks: the unfinished run can't be scored,
          // so the shell says so and starts a new one
          finished = true;
          props.finish(events);
          return;
        }
        props.started();
        events.push({ t_ms: now(), kind: "round_start" });
        const delay = challenge.delays_ms[attempt++];
        setPhase("waiting");
        timer = window.setTimeout(() => {
          goAt = now();
          events.push({ t_ms: goAt, kind: "go" });
          setPhase("go");
        }, delay);
        return;
      }
      case "waiting":
        window.clearTimeout(timer);
        events.push({ t_ms: now(), kind: "click" });
        setPhase("early");
        return;
      case "go": {
        const t = now();
        events.push({ t_ms: t, kind: "click" });
        const done = [...rounds(), Math.round((t - goAt) * 100) / 100];
        setRounds(done);
        props.progress?.(done.length);
        if (done.length === challenge.rounds) {
          finished = true;
          props.finish(events);
        } else setPhase("round-done");
        return;
      }
    }
  }

  /** Live: the server says what a press was (the start of a round, too soon, a time). */
  function pressLive() {
    if (phase() === "go") {
      live!.send({ type: "click", ms: Math.round((performance.now() - goAt) * 100) / 100 });
      return;
    }
    if (phase() !== "waiting") props.started();
    live!.send({ type: "press" });
  }

  /** Live: what the server says. */
  function heard(message: LiveMessage) {
    const m = message as ReactionLive;
    switch (m.type) {
      case "waiting":
        setPhase("waiting");
        return;
      case "go":
        goAt = performance.now();
        setPhase("go");
        return;
      case "early":
        setPhase("early");
        return;
      case "round":
        setRounds((done) => [...done, m.ms]);
        props.progress?.(m.done);
        setPhase("round-done");
        return;
      case "over":
        finished = true;
        props.finish([]);
    }
  }
  if (live) {
    onCleanup(live.onMessage(heard));
    live.begin();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== " " || e.repeat) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, [role=dialog]")) return;
    e.preventDefault();
    press();
  }

  onMount(() => window.addEventListener("keydown", onKeyDown));
  onCleanup(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.clearTimeout(timer);
  });

  const lastRound = () => rounds()[rounds().length - 1];

  return (
    <div
      role="button"
      data-testid="reaction-panel"
      class={`flex min-h-[60dvh] w-full cursor-pointer touch-manipulation [-webkit-tap-highlight-color:transparent] sm:min-h-80 flex-col items-center justify-center gap-4 rounded-lg text-[2rem] select-none ${PANEL_COLOURS[phase()]}`}
      onPointerDown={(e) => {
        if (e.button === 0) press();
      }}
    >
      <Switch>
        <Match when={phase() === "idle"}>
          <i class="fa-solid fa-bolt text-[4rem] text-main" />
          <span>reaction time</span>
          <span class="text-base text-sub">
            {act()}
            <span class="touch:hidden">
              {" "}
              or press <kbd>space</kbd>
            </span>{" "}
            to start
          </span>
        </Match>
        <Match when={phase() === "waiting"}>wait for it…</Match>
        <Match when={phase() === "go"}>{act()}!</Match>
        <Match when={phase() === "early"}>too soon — {act()} to try again</Match>
        <Match when={phase() === "round-done"}>
          <span class="text-[4rem] text-main">{lastRound()} ms</span>
          <span class="text-base text-sub">{act()} to continue</span>
          <span class="text-base text-sub">
            {rounds().length} / {props.challenge.rounds}
          </span>
        </Match>
      </Switch>
    </div>
  );
}
