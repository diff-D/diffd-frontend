import { Show, onCleanup } from "solid-js";
import type { DuelLobby } from "../api/types";
import RemoteButton from "../ui/RemoteButton";

function Seat(props: { name: string; ready: boolean; you?: boolean }) {
  return (
    <div class="flex flex-col items-center gap-2">
      <span class={`text-[1.5rem] ${props.you ? "text-main" : "text-text"}`}>{props.name}</span>
      <span data-testid={props.you ? "my-ready" : "opponent-ready"} class={props.ready ? "text-main" : "text-sub"}>
        <i class={`fa-solid ${props.ready ? "fa-circle-check" : "fa-hourglass-half"}`} /> {props.ready ? "ready" : "not ready"}
      </span>
    </div>
  );
}

/** Paired: both say they're ready before the match starts, within the time left. */
export default function Lobby(props: {
  lobby: DuelLobby;
  testName: string;
  /** The room's practice settings in a line; absent for the ranked game. */
  practice?: string;
  readiness: { you: boolean; opponent: boolean };
  secondsLeft: number;
  onReady: () => void;
  onLeave: () => void;
  /** The test can be played from a phone: offer to pair one. */
  remote: boolean;
}) {
  // r says ready, as in a party's lobby
  function onKeyDown(e: KeyboardEvent) {
    if (e.key !== "r" || e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (!props.readiness.you) props.onReady();
  }
  window.addEventListener("keydown", onKeyDown);
  onCleanup(() => window.removeEventListener("keydown", onKeyDown));

  return (
    <div data-testid="duel-lobby" class="flex flex-col items-center gap-8 text-center">
      <span class="text-sub">
        {props.testName} · 1v1
        <Show when={props.practice}>
          {(line) => <span data-testid="lobby-settings" class="text-main"> · practice · {line()}</span>}
        </Show>
      </span>
      <div class="flex items-center gap-12">
        <Seat name={`${props.lobby.you.name} (you)`} ready={props.readiness.you} you />
        <span class="text-sub">vs</span>
        <Seat name={props.lobby.opponent.name} ready={props.readiness.opponent} />
      </div>
      <Show when={props.remote}>
        <RemoteButton />
      </Show>
      <span data-testid="ready-left" class="text-sub">
        {props.secondsLeft}s to get ready
      </span>
      <div class="flex gap-4">
        <Show
          when={!props.readiness.you}
          fallback={<span class="text-sub">waiting for {props.lobby.opponent.name}…</span>}
        >
          <button type="button" class="btn" aria-keyshortcuts="r" title="ready (r)" onClick={() => props.onReady()}>
            <i class="fa-solid fa-check" /> ready
          </button>
        </Show>
        <button type="button" class="btn-text" onClick={() => props.onLeave()}>
          leave
        </button>
      </div>
    </div>
  );
}
