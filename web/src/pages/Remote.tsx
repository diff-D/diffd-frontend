import { Show, createSignal, onCleanup, onMount } from "solid-js";
import { remote } from "../api/client";
import type { RemoteMessage } from "../api/types";
import Controls, { type LiveAnswer } from "../remote/Controls";
import type { RemoteAction, RemoteSpec, RemoteVerdict } from "../tests/shell/remote";

/**
 * The phone as a controller: it shows what the test on the computer needs (a number pad,
 * a text box for words, the tiles, two big buttons) and sends each press straight there.
 */
export default function Remote() {
  const [paired, setPaired] = createSignal<boolean>();
  const [online, setOnline] = createSignal(false);
  const [desk, setDesk] = createSignal(false);
  const [spec, setSpec] = createSignal<RemoteSpec | null>(null);
  /** A live run: whether the phone's last answer was right, straight from the server. */
  const [liveVerdict, setLiveVerdict] = createSignal<RemoteVerdict>();
  /** A live run: the question after the phone's answer, from the server, before the page says. */
  const [ahead, setAhead] = createSignal<{ index: number; prompt?: string }>();
  const [adjusting, setAdjusting] = createSignal(false);
  /** The remote was opened on another screen, which has the link now. */
  const [replaced, setReplaced] = createSignal(false);
  let socket: WebSocket | undefined;
  let retry: number | undefined;
  let stopped = false;

  /** A live run's answer: straight to the server, which judges it. */
  function sendLive(input: LiveAnswer, shown: number | undefined) {
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "live", input, shown }));
    navigator.vibrate?.(15);
  }

  function send(action: RemoteAction) {
    if (socket?.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "input", action }));
    navigator.vibrate?.(15);
  }

  function connect() {
    const ws = new WebSocket(remote.socketUrl("phone"));
    socket = ws;
    ws.onopen = () => setOnline(true);
    ws.onmessage = (e) => {
      const message = JSON.parse(String(e.data)) as RemoteMessage;
      if (message.type === "desk") setDesk(message.online);
      else if (message.type === "screen") setSpec(message.spec as RemoteSpec | null);
      else if (message.type === "replaced") setReplaced(true);
      else if (message.type === "answered") {
        if (message.good !== undefined) setLiveVerdict({ verdict: message.good ? "good" : "bad", id: (liveVerdict()?.id ?? 0) + 1 });
        if (message.next) setAhead(message.next);
      }
    };
    ws.onclose = () => {
      setOnline(false);
      // only one remote at a time: taking the link back is a choice, not a reconnect
      if (stopped || replaced()) return;
      // forgotten on the computer, or just a dropped connection?
      remote.me().then(
        () => (retry = window.setTimeout(connect, 2000)),
        () => setPaired(false),
      );
    };
  }

  onMount(async () => {
    try {
      await remote.me();
      setPaired(true);
      connect();
    } catch {
      setPaired(false);
    }
  });
  onCleanup(() => {
    stopped = true;
    window.clearTimeout(retry);
    socket?.close();
  });


  return (
    <div data-testid="remote" class="mx-auto flex min-h-[80vh] w-full max-w-md flex-col gap-6 pt-4">
      <Show
        when={paired() !== false && !replaced()}
        fallback={
          <Show
            when={replaced()}
            fallback={
              <p data-testid="remote-unpaired" class="pt-16 text-center text-sub">
                this phone isn't paired: scan the QR code under "remote" on a test page
              </p>
            }
          >
            <div data-testid="remote-replaced" class="flex flex-col items-center gap-4 pt-16 text-center">
              <p class="text-sub">the remote is open on another screen</p>
              <button
                type="button"
                class="btn"
                onClick={() => {
                  setReplaced(false);
                  connect();
                }}
              >
                use it here
              </button>
            </div>
          </Show>
        }
      >
        <div class="flex items-center justify-between text-sm text-sub">
          <span>diff'D remote</span>
          <span class="flex items-center gap-2">
            <span data-testid="remote-status" class={online() && desk() ? "text-main" : "text-sub"}>
              {!online() ? "connecting…" : desk() ? "connected" : "computer not on a test"}
            </span>
            <button type="button" class="btn-text" aria-label="layout" aria-expanded={adjusting()} onClick={() => setAdjusting((a) => !a)}>
              <i class="fa-solid fa-sliders" />
            </button>
          </span>
        </div>
        <Controls spec={spec()} send={send} sendLive={sendLive} liveVerdict={liveVerdict()} ahead={ahead()} adjusting={adjusting()} onDone={() => setAdjusting(false)} waiting="waiting for a test on your computer…" />
      </Show>
    </div>
  );
}
