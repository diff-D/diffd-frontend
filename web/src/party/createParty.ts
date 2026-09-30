import { createEffect, createSignal, onCleanup } from "solid-js";
import { parties } from "../api/client";
import type { PartyChatLine, PartyClientMessage, PartyRunResult, PartyMessage, PartyResults, PartyStarted, PartyState, SketchOp, SketchState } from "../api/types";
import { endFocus, startFocus } from "../state/focus";
import { notify } from "../state/notices";
import { testDef } from "../tests/registry";
import { type LiveRun, createLiveRun } from "../tests/shell/live";
import { type Outcome, createOutcome } from "../tests/shell/outcome";
import { createBatcher } from "./sketch/drawing";

/**
 * `connecting`, then `lobby` between games; in a game, `countdown`, `playing` and then
 * `finished` (your run saved, waiting for the others); `spectating` when you arrived during
 * a game; `sketching` for the whole of a game of sketch; `closed` when the party is gone
 * for you.
 */
/** A game this party played: its placings, and your own run of it when you played it. */
export type PlayedGame = {
  results: PartyResults;
  /** `id`: your id in its placings (it changes if you reconnect later). */
  mine?: { id: string; started: PartyStarted; outcome: Outcome<unknown>; events: unknown[] };
};

/** How long the party keeps a dropped member's seat (server: `AWAY_GRACE`). */
const SEAT_KEPT_MS = 115_000;

export type PartyStage = "connecting" | "lobby" | "countdown" | "playing" | "finished" | "spectating" | "sketching" | "closed";

/** Sketch's turn, with when its phase ends (`performance.now()` time). */
export type SketchTurn = SketchState & { endsAt: number };

/**
 * Your side of a party: the socket, the shared state, your run of each game. `joined`
 * hears the party's code (to show it in the address).
 */
export function createParty(joined?: (code: string) => void) {
  const [stage, setStage] = createSignal<PartyStage>("connecting");
  const [me, setMe] = createSignal<string>();
  const [party, setParty] = createSignal<PartyState>();
  const [game, setGame] = createSignal<PartyStarted>();
  const [countdown, setCountdown] = createSignal(0);
  /** Everyone's live number, and saved score once they finish, in the current game. */
  const [progress, setProgress] = createSignal<Record<string, number>>({});
  const [scores, setScores] = createSignal<Record<string, number>>({});
  const [results, setResults] = createSignal<PartyResults>();
  /** Every game this party played since you joined, oldest first. */
  const [played, setPlayed] = createSignal<PlayedGame[]>([]);
  /** Other players' runs looked at, by `game:id`. */
  const [runResults, setRunResults] = createSignal<Record<string, PartyRunResult>>({});
  /** The chat's latest lines, oldest first. */
  const [chat, setChat] = createSignal<PartyChatLine[]>([]);
  const [events, setEvents] = createSignal<unknown[]>([]);
  const [notice, setNotice] = createSignal("");
  /** Why the party closed for this page (`replaced`: it is open in another tab). */
  const [closedBy, setClosedBy] = createSignal<string>();
  /** Sketch: the turn, the words you may pick (when drawing next), and the drawing. */
  const [sketch, setSketch] = createSignal<SketchTurn>();
  const [sketchWords, setSketchWords] = createSignal<string[]>([]);
  // the drawing's steps grow in place; `drawing` changes with them (`epoch`: a new drawing)
  let ops: SketchOp[] = [];
  const [drawing, setDrawing] = createSignal({ epoch: 0, ops, length: 0 });
  const redraw = (next?: SketchOp[]) => {
    if (next) ops = next;
    setDrawing((d) => ({ epoch: next ? d.epoch + 1 : d.epoch, ops, length: ops.length }));
  };
  const { outcome, save, settle, clear } = createOutcome<unknown>();
  /** Your run of the game, when played live (see tests/shell/live.ts). */
  const [liveRun, setLiveRun] = createSignal<LiveRun>();
  let socket: WebSocket | undefined;
  let ticker: number | undefined;
  let told = false;
  /** The party's code once joined, reconnection attempts since the connection dropped, and when it dropped. */
  let code: string | undefined;
  let attempts = 0;
  let droppedAt = 0;
  let retry: number | undefined;
  let rejoining = false;

  const isHost = () => party()?.host === me();

  const addLine = (line: PartyChatLine) => setChat((lines) => [...lines.slice(-49), line]);

  function send(message: PartyClientMessage) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  // a guest's own name, kept for the tab's other parties
  const ALIAS_KEY = "diffd:party-alias";
  let aliasTried = false;
  function rename(name: string) {
    try {
      sessionStorage.setItem(ALIAS_KEY, name);
    } catch {
      // without storage, the next party starts with the name it gives
    }
    send({ type: "rename", name });
  }

  const tokenKey = (room: string) => `diffd:party:${room}`;
  function savedToken(room: string): string | undefined {
    try {
      return sessionStorage.getItem(tokenKey(room)) ?? undefined;
    } catch {
      return undefined;
    }
  }

  function connect(room?: string) {
    setClosedBy(undefined);
    leave();
    aliasTried = false;
    if (!rejoining) setStage("connecting");
    setNotice(rejoining ? "reconnecting…" : "");
    const ws = new WebSocket(parties.socketUrl(room, room ? savedToken(room) : undefined));
    socket = ws;
    ws.onmessage = (e) => {
      if (socket === ws) handle(JSON.parse(String(e.data)) as PartyMessage);
    };
    ws.onclose = () => {
      if (socket !== ws) return;
      socket = undefined;
      window.clearInterval(ticker);
      endFocus();
      if (stage() === "closed") return;
      // a dropped connection: back to the same seat, trying for as long as the party keeps
      // it (2 minutes), a little less often each time (at most every 5 s)
      if (attempts === 0) droppedAt = Date.now();
      if (code && Date.now() - droppedAt < SEAT_KEPT_MS) {
        attempts += 1;
        rejoining = true;
        setNotice("reconnecting…");
        const room = code;
        retry = window.setTimeout(() => connect(room), Math.min(5000, 1000 * attempts));
        return;
      }
      setNotice(notice() && notice() !== "reconnecting…" ? notice() : "connection lost");
      setStage("closed");
    };
  }

  function handle(message: PartyMessage) {
    switch (message.type) {
      case "joined":
        setMe(message.id);
        code = message.code;
        attempts = 0;
        setNotice("");
        try {
          sessionStorage.setItem(tokenKey(message.code), message.rejoin);
        } catch {
          // without storage, a dropped connection just means joining afresh
        }
        joined?.(message.code);
        return;
      case "state":
        setParty(message);
        if (!aliasTried) {
          // a guest who named themselves in an earlier party of this tab keeps the name
          aliasTried = true;
          const mine = message.members.find((m) => m.id === me());
          let saved: string | null = null;
          try {
            saved = sessionStorage.getItem(ALIAS_KEY);
          } catch {
            // no storage: no name to keep
          }
          if (mine && !mine.user && saved && /^guest \d+$/.test(mine.name)) send({ type: "rename", name: saved });
        }
        if (stage() === "connecting" || rejoining) {
          // a run cut off by the dropped connection is over: watch until the next game
          rejoining = false;
          setStage(message.stage === "playing" ? "spectating" : "lobby");
        }
        else if (message.stage === "lobby" && stage() === "spectating") setStage("lobby");
        return;
      case "started":
        liveRun()?.close();
        setLiveRun(message.live ? createLiveRun(message.run_id) : undefined);
        setGame(message);
        setProgress({});
        setScores({});
        setResults(undefined);
        setEvents([]);
        clear();
        told = false;
        countDown(message.countdown_ms);
        return;
      case "progress":
        setProgress((all) => ({ ...all, [message.id]: message.value }));
        return;
      case "finished":
        setScores((all) => ({ ...all, [message.id]: message.score }));
        return;
      case "run_result":
        setRunResults((all) => ({ ...all, [`${message.game}:${message.id}`]: message }));
        return;
      case "chat": {
        // while a word is drawn, what the drawer and those who have it say stays among them
        const turn = sketch();
        const insider = turn?.phase === "drawing" && (message.id === turn.drawer || turn.guessed.includes(message.id));
        addLine({ id: message.id, name: message.name, text: message.text, kind: insider ? "insider" : undefined });
        return;
      }
      case "sketch": {
        const previous = sketch();
        setSketch({ ...message, endsAt: performance.now() + message.ends_in_ms });
        // a new turn starts a new drawing; arriving mid-turn, you get it so far
        if (!previous || previous.turn !== message.turn || message.phase === "choosing" || message.ops.length > 0) redraw([...message.ops]);
        if (message.phase !== "choosing") setSketchWords([]);
        setStage("sketching");
        return;
      }
      case "sketch_words":
        setSketchWords(message.words);
        return;
      case "sketch_draw":
        ops.push(...message.ops);
        redraw();
        return;
      case "sketch_hint":
        setSketch((turn) => turn && { ...turn, mask: message.mask });
        return;
      case "sketch_guessed":
        setSketch((turn) => turn && { ...turn, guessed: [...turn.guessed, message.id] });
        addLine({ id: message.id, name: message.id === me() ? "you" : message.name, text: "got it!", kind: "guessed" });
        return;
      case "sketch_hidden":
        addLine({ id: me() ?? "", name: "you", text: message.text, kind: "hidden", close: message.close });
        return;
      case "results":
        setResults(message);
        {
          // your run of it, kept to look back at from the lobby
          const started = game();
          const saved = outcome();
          const mine = stage() === "finished" && started && saved ? { id: me() ?? "", started, outcome: saved, events: events() } : undefined;
          setPlayed((games) => [...games, { results: message, mine }]);
        }
        window.clearInterval(ticker);
        endFocus();
        // (sketch's last turn stays: its screen may still read it as it goes)
        setSketchWords([]);
        setStage("lobby");
        return;
      case "error":
        if (message.code === "not_found" || message.code === "full" || message.code === "kicked" || message.code === "replaced") {
          setNotice(message.message);
          setClosedBy(message.code);
          setStage("closed");
        } else notify(message.message);
        return;
    }
  }

  function countDown(ms: number) {
    setStage("countdown");
    startFocus();
    window.clearInterval(ticker);
    const ends = performance.now() + ms;
    setCountdown(Math.ceil(ms / 1000));
    ticker = window.setInterval(() => {
      const left = ends - performance.now();
      setCountdown(Math.max(0, Math.ceil(left / 1000)));
      if (left > 0) return;
      window.clearInterval(ticker);
      setStage("playing");
    }, 100);
  }

  // live numbers go out at most every 100 ms, the latest one last
  let progressSentAt = -Infinity;
  let pendingProgress: number | undefined;
  let progressTimer: number | undefined;
  function flushProgress() {
    progressTimer = undefined;
    if (pendingProgress === undefined) return;
    progressSentAt = performance.now();
    send({ type: "progress", value: pendingProgress });
    pendingProgress = undefined;
  }

  function reportProgress(value: number) {
    setProgress((all) => ({ ...all, [me() ?? ""]: value }));
    pendingProgress = value;
    const wait = progressSentAt + 100 - performance.now();
    if (wait <= 0) flushProgress();
    else progressTimer ??= window.setTimeout(flushProgress, wait);
  }

  /** Your play screen is done: score it here and save it like any run. */
  function finish(played: unknown[]) {
    const current = game();
    const def = current && testDef(current.test);
    if (!current || !def || stage() !== "playing") return;
    // the last live number goes before the run is saved
    window.clearTimeout(progressTimer);
    flushProgress();
    const live = liveRun();
    if (live) {
      // the server saved it: its challenge and events, for the results, come with it
      setStage("finished");
      endFocus();
      void settle(live.result, (done) => {
        if (game()?.run_id !== current.run_id) return false;
        setGame({ ...current, challenge: done.challenge });
        setEvents(done.events);
        return true;
      }).then((done) => {
        if (!done.ok) notify(done.message);
      });
      return;
    }
    let local: unknown;
    try {
      local = def.score(current.challenge, played);
    } catch {
      notify("couldn't score this run");
      return;
    }
    setEvents(played);
    void save(current.run_id, played, local);
    setStage("finished");
    endFocus();
  }

  // once the run is saved (first try or a retry), the party may count it
  createEffect(() => {
    if (outcome()?.saved === true && !told) {
      told = true;
      send({ type: "finished" });
    }
  });

  // the drawer's steps show at once, and go out every 50 ms in batches the party accepts
  const batcher = createBatcher();
  let drawTimer: number | undefined;
  function flushDrawing() {
    drawTimer = undefined;
    send({ type: "sketch_draw", ops: batcher.take() });
    if (batcher.waiting()) drawTimer = window.setTimeout(flushDrawing, 50);
  }
  function draw(op: SketchOp) {
    ops.push(structuredClone(op));
    redraw();
    batcher.add(op);
    drawTimer ??= window.setTimeout(flushDrawing, 50);
  }

  function leave() {
    const open = socket;
    socket = undefined;
    open?.close();
    window.clearInterval(ticker);
    window.clearTimeout(retry);
    window.clearTimeout(progressTimer);
    progressTimer = undefined;
  }

  onCleanup(() => {
    liveRun()?.close();
    leave();
    endFocus();
  });

  return {
    stage,
    closedBy,
    me,
    party,
    game,
    countdown,
    progress,
    scores,
    results,
    played,
    chat,
    events,
    notice,
    outcome,
    isHost,
    connect,
    ready: (ready: boolean) => send({ type: "ready", ready }),
    /** The next game: the ranked one, or with practice settings. */
    pick: (test: string, settings?: unknown, local = party()?.local ?? false) => send({ type: "pick", test, settings, local }),
    liveRun,
    start: () => send({ type: "start" }),
    /** Host: remove a member. */
    kick: (id: string) => send({ type: "kick", id }),
    say: (text: string) => send({ type: "chat", text }),
    /** A guest's own name in the party. */
    rename,
    /** A player's run of a past game: asked for once, then `runResult` has it. */
    runResult: (game: number, id: string) => runResults()[`${game}:${id}`],
    requestResult: (game: number, id: string) => {
      if (!runResults()[`${game}:${id}`]) send({ type: "result", game, id });
    },
    reportProgress,
    finish,
    sketch,
    sketchWords,
    drawing,
    /** Sketch: the drawer picks a word, and draws. */
    pickWord: (index: number) => send({ type: "sketch_pick", index }),
    draw,
  };
}
