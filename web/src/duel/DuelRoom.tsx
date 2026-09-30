import { A } from "@solidjs/router";
import { Match, Show, Switch, createEffect, createSignal, onMount } from "solid-js";
import { Dynamic } from "solid-js/web";
import { challenges } from "../api/client";
import type { DuelResult } from "../api/types";
import { withNext } from "../pages/next";
import { currentUsername, identity } from "../state/identity";
import { phoneLink, usePhoneLink } from "../state/remote";
import { notify } from "../state/notices";
import ResultFrame from "../tests/shell/ResultFrame";
import { loadSettings } from "../tests/shell/settings";
import SettingsGroups, { settingsSummary } from "../tests/shell/SettingsGroups";
import type { AnyTestDef } from "../tests/shell/types";
import { createDuel } from "./createDuel";
import { copyText } from "../ui/clipboard";
import DuelStatus from "./DuelStatus";
import InviteFriends from "../ui/InviteFriends";
import Lobby from "./Lobby";

const VERDICTS = {
  win: { text: "you won", colour: "text-main" },
  loss: { text: "you lost", colour: "text-error" },
  draw: { text: "draw", colour: "text-sub" },
} as const;

function Verdict(props: {
  result: DuelResult;
  def: AnyTestDef;
  opponent: string;
  /** The opponent has an account: their name links to their profile. */
  opponentIsUser: boolean;
  opponentLeft: boolean;
  rematchAsked: boolean;
  rematchWanted: boolean;
  onRematch: () => void;
  onAgain: () => void;
}) {
  const score = (value: number | null) => (value === null ? "—" : props.def.formatScore(value));
  return (
    <div data-testid="duel-result" class="flex flex-col items-center gap-2 text-center">
      <span class={`text-[3rem] leading-none ${VERDICTS[props.result.outcome].colour}`}>{VERDICTS[props.result.outcome].text}</span>
      <span class="text-sub">
        you {score(props.result.you)} ·{" "}
        <Show when={props.opponentIsUser} fallback={props.opponent}>
          <A href={`/u/${encodeURIComponent(props.opponent)}`} class="text-text hover:text-main">
            {props.opponent}
          </A>
        </Show>{" "}
        {score(props.result.opponent)}
      </span>
      <Show when={props.result.rematch && props.rematchWanted && !props.rematchAsked}>
        <span class="text-main">{props.opponent} wants a rematch</span>
      </Show>
      <Show when={props.opponentLeft && !props.result.rematch}>
        <span class="text-sub">{props.opponent} left</span>
      </Show>
      <div class="mt-2 flex flex-wrap justify-center gap-4">
        <Show when={props.result.rematch}>
          <button type="button" class="btn" disabled={props.rematchAsked} onClick={() => props.onRematch()}>
            {props.rematchAsked ? `waiting for ${props.opponent}…` : "rematch"}
          </button>
        </Show>
        <button type="button" class="btn" onClick={() => props.onAgain()}>
          play again
        </button>
      </div>
    </div>
  );
}

/** A 1v1 of one test: lobby, waiting, countdown, the test itself, then the verdict. */
export default function DuelRoom(props: { def: AnyTestDef; code?: string; challenge?: string }) {
  const def = props.def;
  const duel = createDuel(def);
  usePhoneLink();
  const opponent = () => duel.match()?.opponent.name ?? duel.lobby()?.opponent.name ?? "your opponent";
  const format = (value: number) => (def.formatProgress ?? def.formatScore)(value);
  const link = () => `${location.origin}/duel/${def.id}/${duel.invite()}`;

  // unjumble's dictionary must be here before its play screen mounts
  const [ready, setReady] = createSignal(!def.prepare);
  const [prepareFailed, setPrepareFailed] = createSignal(false);
  async function prepare(): Promise<boolean> {
    if (!def.prepare || ready()) return true;
    setPrepareFailed(false);
    try {
      await def.prepare.load();
      setReady(true);
      return true;
    } catch {
      setPrepareFailed(true);
      return false;
    }
  }

  // an invite link: someone signed in joins straight away; anyone else first chooses to
  // sign in or to play as a guest
  const [asking, setAsking] = createSignal(false);
  const [started, setStarted] = createSignal(false);
  onMount(async () => {
    if (!(await prepare())) return;
    if (props.challenge) duel.connect({ challenge: props.challenge });
  });
  createEffect(() => {
    const me = identity();
    if (!props.code || started() || !me || !ready()) return;
    setStarted(true);
    if (me.kind === "user") duel.connect({ room: props.code });
    else setAsking(true);
  });
  function joinAsGuest() {
    setAsking(false);
    duel.connect({ room: props.code });
  }
  const here = () => `${location.pathname}${location.search}`;

  // a friend's room plays the ranked game, or practice settings chosen here (starting from
  // the ones last practised on the test page)
  const [roomSettings, setRoomSettings] = createSignal<unknown>();
  const [tuning, setTuning] = createSignal(false);
  const practiceLine = (settings: unknown) => settingsSummary(def, settings, "practice");
  const roomLine = () => {
    const settings = roomSettings();
    return settings === undefined ? "ranked" : `practice · ${practiceLine(settings)}`;
  };

  function copy() {
    copyText(link()).then(
      () => notify("link copied"),
      () => notify("couldn't copy — select the link instead"),
    );
  }

  return (
    <div class="flex grow flex-col gap-8 pt-8" data-stage={duel.stage()}>
      <Switch>
        <Match when={asking()}>
          <div data-testid="join-choice" class="flex flex-col items-center gap-6 text-center">
            <i class={`fa-solid ${def.icon} text-[4rem] text-main`} />
            <span class="text-[2rem] text-text">you've been invited to a {def.name} 1v1</span>
            <span class="max-w-xl text-sub">sign in so the match counts for your account, or play straight away as a guest</span>
            <div class="flex flex-wrap justify-center gap-4">
              <A href={withNext("/login", here())} class="btn">
                sign in to play
              </A>
              <A href={withNext("/register", here())} class="btn">
                sign up
              </A>
              <button type="button" class="btn" onClick={joinAsGuest}>
                play as guest
              </button>
            </div>
          </div>
        </Match>
        <Match when={duel.stage() === "ready" ? duel.lobby() : undefined}>
          {(lobby) => (
            <Lobby
              lobby={lobby()}
              testName={def.name}
              practice={lobby().settings === undefined ? undefined : practiceLine(lobby().settings)}
              readiness={duel.readiness()}
              secondsLeft={duel.readyLeft()}
              onReady={() => duel.ready()}
              onLeave={() => duel.backToMenu()}
              remote={def.remote === true}
            />
          )}
        </Match>
        <Match when={props.code && !started() && duel.stage() === "menu" && !prepareFailed()}>
          <p class="text-center text-sub">joining…</p>
        </Match>
        <Match when={duel.stage() === "menu"}>
          <div class="flex flex-col items-center gap-6 text-center">
            <i class={`fa-solid ${def.icon} text-[4rem] text-main`} />
            <span class="text-[2rem] text-text">{def.name} · 1v1</span>
            <span class="max-w-xl text-sub">the same challenge for both of you, at the same time: the better score wins</span>
            <Show when={duel.notice()}>
              <p class="text-error">{duel.notice()}</p>
            </Show>
            <Show when={!ready() && def.prepare}>
              {(needs) => (
                <p class={prepareFailed() ? "text-error" : "text-sub"}>
                  {prepareFailed() ? needs().error : needs().loading}{" "}
                  <Show when={prepareFailed()}>
                    <button type="button" class="btn-text" onClick={() => void prepare()}>
                      try again
                    </button>
                  </Show>
                </p>
              )}
            </Show>
            <div class="flex flex-wrap justify-center gap-4">
              <button type="button" class="btn primary" disabled={!ready()} onClick={() => duel.connect()}>
                find an opponent
              </button>
              <button type="button" class="btn" disabled={!ready()} onClick={() => duel.connect({ invite: true, settings: roomSettings() })}>
                play a friend
              </button>
            </div>
            <div class="flex w-full flex-col items-center gap-3 text-sm">
              <button type="button" data-testid="room-settings" class="btn-text" aria-expanded={tuning()} onClick={() => setTuning(!tuning())}>
                <i class="fa-solid fa-sliders" /> with a friend: {roomLine()}
              </button>
              <Show when={tuning()}>
                <section data-testid="room-settings-panel" class="flex w-full max-w-xl flex-col gap-4 rounded-lg bg-sub-alt p-4 text-left">
                  <SettingsGroups
                    def={def}
                    value={roomSettings() ?? loadSettings(def.id, def.settings).practice}
                    onChange={(next) => setRoomSettings(() => next)}
                  />
                  <div class="flex justify-between gap-4 border-t border-bg pt-3">
                    <span class="text-sub">custom settings are practice: they don't count for the leaderboards</span>
                    <button type="button" class="btn-text shrink-0 !p-0" onClick={() => setRoomSettings(undefined)}>
                      back to ranked
                    </button>
                  </div>
                </section>
              </Show>
            </div>
          </div>
        </Match>
        <Match when={duel.stage() === "searching" || duel.stage() === "joining"}>
          <div class="flex flex-col items-center gap-4 text-center">
            <span class="text-[1.5rem] text-text">{duel.stage() === "joining" ? "joining your friend…" : "looking for an opponent…"}</span>
            <button type="button" class="btn-text" onClick={() => duel.backToMenu()}>
              cancel
            </button>
          </div>
        </Match>
        <Match when={duel.stage() === "challenging"}>
          <div class="flex flex-col items-center gap-4 text-center">
            <i class="fa-solid fa-bolt text-[3rem] text-main" />
            <span class="text-[1.5rem] text-text">waiting for {props.challenge} to accept…</span>
            <span class="text-sub">they've been sent a notification; the challenge lasts 5 minutes</span>
            <button type="button" class="btn-text" onClick={() => duel.backToMenu()}>
              cancel
            </button>
          </div>
        </Match>
        <Match when={duel.stage() === "inviting"}>
          <div class="flex flex-col items-center gap-6 text-center">
            <span class="text-[1.5rem] text-text">waiting for your friend…</span>
            <Show when={roomSettings() !== undefined}>
              <span data-testid="room-mode" class="text-main">{roomLine()}</span>
            </Show>
            <Show when={duel.invite()} fallback={<span class="text-sub">opening a room…</span>}>
              {(room) => (
                <>
                  <div class="flex w-full max-w-xl flex-col gap-2 text-left">
                    <span class="text-sub">anyone with this link can join, with or without an account</span>
                    <div class="flex gap-2">
                      <input
                        data-testid="invite-link"
                        aria-label="invite link"
                        class="field grow"
                        readOnly
                        value={link()}
                        onFocus={(e) => e.currentTarget.select()}
                      />
                      <button type="button" class="btn" onClick={copy}>
                        <i class="fa-solid fa-copy" /> copy
                      </button>
                    </div>
                  </div>
                  <Show when={currentUsername()}>
                    <InviteFriends send={(username) => challenges.invite(username, room())} />
                  </Show>
                </>
              )}
            </Show>
            <button type="button" class="btn-text" onClick={() => duel.backToMenu()}>
              cancel
            </button>
          </div>
        </Match>
        <Match when={duel.stage() === "countdown"}>
          <div class="flex flex-col items-center gap-4 text-center">
            <span class="text-[2rem] text-text">you vs {opponent()}</span>
            <span data-testid="countdown" class="text-[6rem] leading-none text-main">
              {duel.countdown()}
            </span>
          </div>
        </Match>
        <Match when={duel.stage() === "playing" ? duel.match() : undefined} keyed>
          {(match) => (
            <>
              <DuelStatus
                opponent={opponent()}
                mine={duel.mine()}
                theirs={duel.theirs()}
                theirScore={duel.theirScore()}
                format={format}
                formatScore={def.formatScore}
              />
              <Show when={duel.opponentLeft()}>
                <p class="text-center text-sub">{opponent()} left — finish to win</p>
              </Show>
              <Dynamic
                component={def.Play}
                challenge={match.challenge}
                settings={match.settings}
                started={() => {}}
                finish={duel.finish}
                progress={duel.progress}
                remote={def.remote ? phoneLink : undefined}
                live={duel.liveRun()}
                opponentCaret={duel.theirCaret()}
              />
            </>
          )}
        </Match>
        <Match when={(duel.stage() === "finished" || duel.stage() === "result") && duel.match() && duel.outcome()}>
          {(outcome) => (
            <>
              <Show
                when={duel.result()}
                fallback={
                  <p class="text-center text-sub">
                    <Show when={!duel.opponentLeft()} fallback={`${opponent()} left — saving your run for the win…`}>
                      waiting for {opponent()}…
                    </Show>
                  </p>
                }
              >
                {(result) => (
                  <Verdict
                    result={result()}
                    def={def}
                    opponent={opponent()}
                    opponentIsUser={duel.match()?.opponent.user ?? false}
                    opponentLeft={duel.opponentLeft()}
                    rematchAsked={duel.rematchAsked()}
                    rematchWanted={duel.rematchWanted()}
                    onRematch={() => duel.rematch()}
                    onAgain={() => duel.backToMenu()}
                  />
                )}
              </Show>
              <ResultFrame
                def={def}
                outcome={outcome()}
                run={{ id: duel.match()!.run_id, mode: duel.match()!.mode, settings: duel.match()!.settings, challenge: duel.match()!.challenge }}
                events={duel.events()}
              />
            </>
          )}
        </Match>
      </Switch>
    </div>
  );
}
