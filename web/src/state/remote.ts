import { createSignal, onCleanup, onMount } from "solid-js";
import { remote } from "../api/client";
import type { RemoteDevice, RemoteMessage } from "../api/types";
import type { RemoteAction, RemoteLink, RemoteSpec } from "../tests/shell/remote";

// The page's side of the phone remote: while a test or 1v1 page is open and the visitor
// has paired phones, a socket tells the phones what to show and brings back their taps.

const [phones, setPhones] = createSignal(0);
const [devices, setDevices] = createSignal<RemoteDevice[]>([]);
export { devices, phones };

const handlers = new Set<(action: RemoteAction) => void>();
let screen: RemoteSpec | null = null;
/** The live run on screen, whose answers a phone gives straight to the server. */
let liveRun: string | null = null;
let socket: WebSocket | undefined;
let retry: number | undefined;
let pages = 0;

function sendScreen() {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "screen", spec: screen }));
}

function sendRun() {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify({ type: "run", run_id: liveRun }));
}

function open() {
  if (socket || pages === 0) return;
  const ws = new WebSocket(remote.socketUrl("desk"));
  socket = ws;
  ws.onopen = () => {
    sendScreen();
    sendRun();
  };
  ws.onmessage = (e) => {
    const message = JSON.parse(String(e.data)) as RemoteMessage;
    if (message.type === "phones") {
      // a phone that just paired joins the list
      if (message.count > phones()) void refreshDevices();
      setPhones(message.count);
    }
    else if (message.type === "input") for (const handle of handlers) handle(message.action as RemoteAction);
  };
  ws.onclose = () => {
    if (socket !== ws) return;
    socket = undefined;
    setPhones(0);
    // back while the page is still open (the server restarted, the network blinked)
    if (pages > 0) retry = window.setTimeout(open, 3000);
  };
}

function close() {
  window.clearTimeout(retry);
  const ws = socket;
  socket = undefined;
  ws?.close();
  setPhones(0);
}

/** The visitor's paired phones; the socket opens when there is one. */
export async function refreshDevices(): Promise<void> {
  try {
    setDevices((await remote.devices()).devices);
  } catch {
    setDevices([]);
  }
  if (devices().length > 0) open();
  else close();
}

/** Pairing started: from now on the socket is wanted, to see the phone arrive. */
export function expectPhone(): void {
  open();
}

/** For a page that plays tests: keeps the phone link up while it is mounted. */
export function usePhoneLink(): void {
  onMount(() => {
    pages += 1;
    void refreshDevices();
  });
  onCleanup(() => {
    pages -= 1;
    if (pages === 0) close();
  });
}

/** Handed to play screens as `remote` (see `tests/shell/remote.ts`). */
export const phoneLink: RemoteLink = {
  show(spec) {
    screen = spec;
    sendScreen();
  },
  onAction(handler) {
    handlers.add(handler);
    return () => handlers.delete(handler);
  },
  run(runId) {
    liveRun = runId;
    sendRun();
  },
};
