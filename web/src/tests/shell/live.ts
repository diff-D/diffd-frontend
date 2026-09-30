import { batch } from "solid-js";
import { runs } from "../../api/client";

/**
 * A message of a live run's session (from the server): `type`
 * says what (a problem, a verdict, a group, "go"…), `at_ms` when it was sent.
 */
export type LiveMessage = { type: string; at_ms: number; [field: string]: unknown };

/**
 * What the page sends (as the server takes it); `index`: the problem, word or group
 * it answers (input for one that has gone is ignored).
 */
type LiveInput =
  | { type: "typed"; value: string; index: number }
  | { type: "enter"; value: string; index: number }
  | { type: "skip"; index: number }
  | { type: "press" }
  | { type: "click"; ms: number };

/** A live run once it is over: the server's score, and now the whole challenge and events. */
export type LiveResult =
  | { ok: true; score: unknown; primary_score: number; is_pb: boolean; challenge: unknown; events: unknown[] }
  | { ok: false; message: string };

type ServerMessage =
  | { type: "resume"; now_ms: number; begun: boolean }
  | { type: "finished"; score: unknown; primary_score: number; is_pb: boolean; challenge: unknown; events: unknown[] }
  | { type: "failed"; message: string }
  | { type: "error"; code: string; message: string }
  | LiveMessage;

/**
 * A run played live: the server shows one question at a time, checks the answers and keeps
 * the clock (the page never has the challenge). The play screen listens with `onMessage`,
 * sends the player's input, and learns the result from `result`. A dropped connection comes
 * back by itself; the server sends everything again, and messages already seen are skipped.
 */
export type LiveRun = {
  runId: string;
  /** The page's countdown is over: the run's clock starts. */
  begin: () => void;
  send: (input: LiveInput) => void;
  /** Every session message, in order, once each; returns a function that stops listening. */
  onMessage: (handler: (message: LiveMessage) => void) => () => void;
  /** When (`performance.now()` time) something the server sent at `at_ms` ends `in_ms` later. */
  deadline: (at_ms: number, in_ms: number) => number;
  result: Promise<LiveResult>;
  close: () => void;
};

export function createLiveRun(runId: string): LiveRun {
  const handlers = new Set<(message: LiveMessage) => void>();
  /** Session messages handled so far: a reconnect's replay skips them. */
  let seen = 0;
  let replaying = 0;
  /** `performance.now()` when the run's clock was at 0. */
  let origin: number | undefined;
  let wantBegin = false;
  let done = false;
  let socket: WebSocket | undefined;
  let retry: number | undefined;
  let attempts = 0;
  let settle!: (result: LiveResult) => void;
  const result = new Promise<LiveResult>((resolve) => (settle = resolve));

  function finish(value: LiveResult) {
    if (done) return;
    done = true;
    settle(value);
    socket?.close();
  }

  function write(message: object) {
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }

  function handle(message: ServerMessage) {
    switch (message.type) {
      case "resume": {
        const { now_ms, begun } = message as { now_ms: number; begun: boolean };
        if (begun) origin = performance.now() - now_ms;
        // what follows is everything sent so far: the part already handled is skipped
        replaying = seen;
        seen = 0;
        if (!begun && wantBegin) write({ type: "begin" });
        return;
      }
      case "finished": {
        const m = message as Extract<ServerMessage, { type: "finished" }>;
        return finish({ ok: true, score: m.score, primary_score: m.primary_score, is_pb: m.is_pb, challenge: m.challenge, events: m.events });
      }
      case "failed":
        return finish({ ok: false, message: (message as { message: string }).message });
      case "error":
        if ((message as { code: string }).code === "replaced") return finish({ ok: false, message: "this run went on in another tab" });
        return;
      default: {
        const session = message as LiveMessage;
        seen += 1;
        if (seen <= replaying) return;
        origin ??= performance.now() - session.at_ms;
        // (a copy: a handler may stop listening as it acts)
        for (const handler of Array.from(handlers)) handler(session);
      }
    }
  }

  function connect() {
    const ws = new WebSocket(runs.liveUrl(runId));
    socket = ws;
    ws.onopen = () => (attempts = 0);
    ws.onmessage = (e) => {
      if (socket !== ws) return;
      // a step's session messages come as one list, handled together
      const data = JSON.parse(String(e.data)) as ServerMessage | LiveMessage[];
      if (!Array.isArray(data)) return handle(data);
      batch(() => {
        for (const message of data) handle(message);
      });
    };
    ws.onclose = () => {
      if (socket !== ws || done) return;
      // the run goes on without the page: come back to it, a little less often each time
      attempts += 1;
      if (attempts > 20) return finish({ ok: false, message: "lost the connection to this run" });
      retry = window.setTimeout(connect, Math.min(5000, 500 * attempts));
    };
  }
  connect();

  return {
    runId,
    begin() {
      if (wantBegin) return;
      wantBegin = true;
      write({ type: "begin" });
    },
    send: (input) => write(input),
    onMessage(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    deadline: (at_ms, in_ms) => (origin ?? performance.now()) + at_ms + in_ms,
    result,
    close() {
      done = true;
      window.clearTimeout(retry);
      socket?.close();
    },
  };
}
