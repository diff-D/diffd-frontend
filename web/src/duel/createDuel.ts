import { createEffect, createSignal, onCleanup } from "solid-js";
import { duels } from "../api/client";
import type { DuelCaret, DuelClientMessage, DuelLobby, DuelMatched, DuelResult, DuelServerMessage } from "../api/types";
import { endFocus, startFocus } from "../state/focus";
import { notify } from "../state/notices";
import { type LiveRun, createLiveRun } from "../tests/shell/live";
import { createOutcome } from "../tests/shell/outcome";
import type { AnyTestDef } from "../tests/shell/types";

/** `menu`: choosing how to play; `ready`: paired, in the lobby until both are ready. */
export type DuelStage =
  | "menu"
  | "searching"
  | "inviting"
  | "joining"
  | "challenging"
  | "ready"
  | "countdown"
  | "playing"
  | "finished"
  | "result";

/** This player's side of a 1v1: the socket, the match, the saved run and the result. */
export function createDuel(def: AnyTestDef) {
  const [stage, setStage] = createSignal<DuelStage>("menu");
  const [invite, setInvite] = createSignal<string>();
  const [match, setMatch] = createSignal<DuelMatched>();
  const [lobby, setLobby] = createSignal<DuelLobby>();
  /** Who is ready in the lobby, and the seconds left to get ready. */
  const [readiness, setReadiness] = createSignal({ you: false, opponent: false });
  const [readyLeft, setReadyLeft] = createSignal(0);
  const [countdown, setCountdown] = createSignal(0);
  const [mine, setMine] = createSignal(0);
  const [theirs, setTheirs] = createSignal(0);
  const [theirCaret, setTheirCaret] = createSignal<DuelCaret>();
  /** The opponent's saved score, once they have finished. */
  const [theirScore, setTheirScore] = createSignal<number | null>(null);
  const [opponentLeft, setOpponentLeft] = createSignal(false);
  const [result, setResult] = createSignal<DuelResult>();
  /** Invite rooms, after a result: who has asked to play again. */
  const [rematchAsked, setRematchAsked] = createSignal(false);
  const [rematchWanted, setRematchWanted] = createSignal(false);
  const [events, setEvents] = createSignal<unknown[]>([]);
  const [notice, setNotice] = createSignal("");
  const { outcome, save, settle, clear } = createOutcome<unknown>();
  /** The match's run, when played live (see tests/shell/live.ts). */
  const [liveRun, setLiveRun] = createSignal<LiveRun>();
  let socket: WebSocket | undefined;
  let ticker: number | undefined;
  let told = false;

  function send(message: DuelClientMessage) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  /** Closes the socket on purpose (cancel, play again, leaving the page). */
  function leave() {
    const open = socket;
    socket = undefined;
    open?.close();
    window.clearInterval(ticker);
  }

  /** Forgets one duel; a rematch starts from here. */
  function resetMatch() {
    liveRun()?.close();
    setLiveRun(undefined);
    setMatch(undefined);
    setMine(0);
    setTheirs(0);
    setTheirCaret(undefined);
    setTheirScore(null);
    setOpponentLeft(false);
    setResult(undefined);
    setRematchAsked(false);
    setRematchWanted(false);
    setEvents([]);
    clear();
    told = false;
  }

  function reset() {
    setInvite(undefined);
    setLobby(undefined);
    setReadiness({ you: false, opponent: false });
    resetMatch();
  }

  /**
   * Quick match, a new invite room (ranked, or with practice `settings`), a friend's room, or
   * a challenge to a friend (by name).
   */
  function connect(how: { invite?: boolean; settings?: unknown; room?: string; challenge?: string } = {}) {
    leave();
    reset();
    setNotice("");
    setStage(how.invite ? "inviting" : how.room ? "joining" : how.challenge ? "challenging" : "searching");
    const ws = new WebSocket(duels.socketUrl(def.id, how));
    socket = ws;
    ws.onmessage = (e) => {
      if (socket === ws) handle(JSON.parse(String(e.data)) as DuelServerMessage);
    };
    ws.onclose = () => {
      if (socket !== ws) return;
      socket = undefined;
      if (stage() === "menu") return;
      if (stage() === "result") {
        // the room is over: no rematch any more
        setResult((current) => current && { ...current, rematch: false });
        return;
      }
      window.clearInterval(ticker);
      endFocus();
      setNotice("connection lost");
      setStage("menu");
    };
  }

  function handle(message: DuelServerMessage) {
    switch (message.type) {
      case "waiting":
        setInvite(message.invite);
        return;
      case "lobby":
        setLobby(message);
        setStage("ready");
        tick(message.ready_ms, setReadyLeft);
        return;
      case "ready_state":
        setReadiness({ you: message.you, opponent: message.opponent });
        return;
      case "lobby_closed":
        leave();
        setNotice(message.reason === "timeout" ? "the lobby timed out: not everyone was ready" : `${lobby()?.opponent.name ?? "your opponent"} left the lobby`);
        setStage("menu");
        return;
      case "invite_declined":
        notify(`${message.by} declined your invite`);
        return;
      case "matched":
        resetMatch();
        setMatch(message);
        if (message.live) setLiveRun(createLiveRun(message.run_id));
        countDown(message.countdown_ms);
        return;
      case "progress":
        setTheirs(message.value);
        setTheirCaret(message.caret);
        return;
      case "opponent_finished":
        setTheirScore(message.score);
        return;
      case "opponent_left":
        setOpponentLeft(true);
        setResult((current) => current && { ...current, rematch: false });
        return;
      case "rematch_wanted":
        setRematchWanted(true);
        return;
      case "result":
        setResult(message);
        setStage("result");
        endFocus();
        return;
      case "error":
        // a room that is gone; a challenge says why it ended
        setNotice(message.code === "not_found" && stage() === "joining" ? "this invite has expired" : message.message);
        setStage("menu");
        return;
    }
  }

  /** Counts `set` down from `ms` in whole seconds (on the shared ticker). */
  function tick(ms: number, set: (seconds: number) => void, done?: () => void) {
    window.clearInterval(ticker);
    const ends = performance.now() + ms;
    set(Math.ceil(ms / 1000));
    ticker = window.setInterval(() => {
      const left = ends - performance.now();
      set(Math.max(0, Math.ceil(left / 1000)));
      if (left <= 0) {
        window.clearInterval(ticker);
        done?.();
      }
    }, 100);
  }

  /** In the lobby: this player is ready. */
  function ready() {
    setReadiness((now) => ({ ...now, you: true }));
    send({ type: "ready" });
  }

  function countDown(ms: number) {
    setStage("countdown");
    // the match has begun: notifications wait from here
    startFocus();
    tick(ms, setCountdown, () => {
      setStage("playing");
      startFocus();
    });
  }


  function progress(value: number, caret?: DuelCaret) {
    setMine(value);
    send({ type: "progress", value, caret });
  }

  /** Invite rooms, after a result: play again with the same opponent. */
  function rematch() {
    if (rematchAsked()) return;
    setRematchAsked(true);
    send({ type: "rematch" });
  }

  /** The play screen is done: score it locally and save it like any run (a live run the
   * server saved itself). */
  function finish(played: unknown[]) {
    const current = match();
    if (!current || stage() !== "playing") return;
    const live = liveRun();
    if (live) {
      setStage("finished");
      endFocus();
      void settle(live.result, (done) => {
        if (match()?.run_id !== current.run_id) return false;
        setMatch({ ...current, challenge: done.challenge });
        setEvents(done.events);
        return true;
      }).then((done) => {
        if (!done.ok && match()?.run_id === current.run_id) {
          notify(done.message);
          backToMenu();
        }
      });
      return;
    }
    let local: unknown;
    try {
      local = def.score(current.challenge, played);
    } catch {
      notify("couldn't score this run");
      backToMenu();
      return;
    }
    setEvents(played);
    void save(current.run_id, played, local);
    setStage("finished");
    endFocus();
  }

  // once the run is saved (first try or a retry), the room may count it
  createEffect(() => {
    if (outcome()?.saved === true && !told) {
      told = true;
      send({ type: "finished" });
    }
  });

  function backToMenu() {
    leave();
    reset();
    endFocus();
    setStage("menu");
  }

  onCleanup(() => {
    leave();
    liveRun()?.close();
    endFocus();
  });

  return {
    stage,
    invite,
    lobby,
    readiness,
    readyLeft,
    ready,
    match,
    liveRun,
    countdown,
    mine,
    theirs,
    theirCaret,
    theirScore,
    opponentLeft,
    result,
    rematchAsked,
    rematchWanted,
    events,
    notice,
    outcome,
    connect,
    progress,
    finish,
    rematch,
    backToMenu,
  };
}
