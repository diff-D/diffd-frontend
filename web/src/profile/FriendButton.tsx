import { Match, Switch, createSignal } from "solid-js";
import { errorMessage, friends } from "../api/client";
import type { Relation } from "../api/types";
import { requestAnswered } from "../state/live";
import { notify } from "../state/notices";

/** Add, accept, cancel or unfriend, depending on how the visitor stands with `username`. */
export default function FriendButton(props: { username: string; relation: Relation | undefined; changed: () => void }) {
  const [busy, setBusy] = createSignal(false);
  async function act(action: () => Promise<unknown>) {
    setBusy(true);
    try {
      await action();
      props.changed();
    } catch (err) {
      notify(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  const id = () => props.relation?.request_id ?? "";
  return (
    <Switch
      fallback={
        <button type="button" class="btn" disabled={busy()} onClick={() => void act(() => friends.request(props.username))}>
          <i class="fa-solid fa-user-plus" /> add friend
        </button>
      }
    >
      <Match when={props.relation?.status === "me"}>{null}</Match>
      <Match when={props.relation?.status === "friends"}>
        <button
          type="button"
          class="btn-text"
          disabled={busy()}
          onClick={() => confirm(`unfriend ${props.username}?`) && void act(() => friends.remove(props.username))}
        >
          <i class="fa-solid fa-user-check" /> friends
        </button>
      </Match>
      <Match when={props.relation?.status === "requested"}>
        <button type="button" class="btn-text" disabled={busy()} onClick={() => void act(() => friends.decline(id()))}>
          request sent · cancel
        </button>
      </Match>
      <Match when={props.relation?.status === "incoming"}>
        <button type="button" class="btn" disabled={busy()} onClick={() => {
            requestAnswered(id());
            void act(() => friends.accept(id()));
          }}>
          accept friend request
        </button>
      </Match>
    </Switch>
  );
}
