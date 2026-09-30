import { createEffect, createRoot, createSignal, onCleanup } from "solid-js";
import { challenges, errorMessage, friends, live } from "../api/client";
import type { LiveChallenge, LiveMessage } from "../api/types";
import { testInfo } from "../tests/catalog";
import { playing } from "./focus";
import { currentUsername } from "./identity";
import { type NoticeAction, notify } from "./notices";

/** Something waiting for the user: a challenge to answer, or a friend request. */
type Alert =
  | { kind: "challenge"; id: string; text: string; challenge: LiveChallenge }
  | { kind: "party"; id: string; text: string; room: string }
  | { kind: "friend_request"; id: string; text: string };

const [alerts, setAlerts] = createSignal<Alert[]>([]);
export { alerts };

/** Opens a page (set by the app's layout, which owns the router). */
let go: (path: string) => void = (path) => location.assign(path);
export function setNavigator(navigate: (path: string) => void): void {
  go = navigate;
}

const remove = (id: string) => setAlerts((list) => list.filter((alert) => alert.id !== id));

function add(alert: Alert) {
  setAlerts((list) => [...list.filter((a) => a.id !== alert.id), alert]);
}

/** Toasts wait while the user plays, then come in order. */
const held: { text: string; actions: NoticeAction[]; ms: number }[] = [];
function toast(text: string, actions: NoticeAction[] = [], ms = 4000) {
  if (playing()) held.push({ text, actions, ms });
  else notify(text, { actions, ms });
}

export function acceptChallenge(challenge: LiveChallenge): void {
  remove(challenge.id);
  go(`/duel/${challenge.test}/${challenge.room}`);
}

export function joinParty(id: string, room: string): void {
  remove(id);
  go(`/party/${room}`);
}

export async function declineChallenge(challenge: LiveChallenge): Promise<void> {
  remove(challenge.id);
  try {
    await challenges.decline(challenge.id);
  } catch (err) {
    notify(errorMessage(err));
  }
}

function handle(message: LiveMessage) {
  switch (message.type) {
    case "challenge": {
      const name = testInfo(message.test)?.name ?? message.test;
      const text = `${message.from} challenges you to ${name}${message.practice ? " (practice)" : ""}`;
      add({ kind: "challenge", id: message.id, text, challenge: message });
      const left = Date.parse(message.expires_at) - Date.now();
      setTimeout(() => remove(message.id), Math.max(0, left));
      toast(
        text,
        [
          { label: "accept", run: () => acceptChallenge(message) },
          { label: "decline", run: () => void declineChallenge(message) },
        ],
        Math.min(Math.max(left, 0), 15_000),
      );
      return;
    }
    case "party_invite": {
      const text = `${message.from} invites you to a party`;
      const id = `party-${message.room}`;
      add({ kind: "party", id, text, room: message.room });
      toast(text, [{ label: "join", run: () => joinParty(id, message.room) }], 15_000);
      return;
    }
    case "challenge_cancelled":
      remove(message.id);
      return;
    case "friend_request":
      add({ kind: "friend_request", id: message.request_id, text: `${message.from} wants to be friends` });
      toast(`${message.from} wants to be friends`, [{ label: "view", run: () => go("/friends") }]);
      return;
    case "friend_accepted":
      toast(`${message.by} accepted your friend request`);
      return;
  }
}

/** Requests that came while the user was away. */
async function loadRequests() {
  try {
    const list = await friends.list();
    for (const request of list.incoming) add({ kind: "friend_request", id: request.id, text: `${request.username} wants to be friends` });
  } catch {
    // the bell simply shows fewer
  }
}

/** Forgets a friend request once it is answered (on the friends page or a profile). */
export function requestAnswered(id: string): void {
  remove(id);
}

createRoot(() => {
  // held toasts come once the run is over
  createEffect(() => {
    if (playing()) return;
    for (const { text, actions, ms } of held.splice(0)) notify(text, { actions, ms });
  });

  // one socket while signed in; it comes back after a lost connection
  createEffect(() => {
    const user = currentUsername();
    setAlerts([]);
    if (!user) return;
    let socket: WebSocket | undefined;
    let retry: number | undefined;
    let delay = 1000;
    let stopped = false;
    const open = () => {
      socket = new WebSocket(live.socketUrl());
      socket.onopen = () => {
        delay = 1000;
        void loadRequests();
      };
      socket.onmessage = (e) => handle(JSON.parse(String(e.data)) as LiveMessage);
      socket.onclose = () => {
        if (stopped) return;
        retry = window.setTimeout(open, delay);
        delay = Math.min(delay * 2, 30_000);
      };
    };
    open();
    onCleanup(() => {
      stopped = true;
      window.clearTimeout(retry);
      socket?.close();
    });
  });
});
