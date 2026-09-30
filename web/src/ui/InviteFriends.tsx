import { For, Show, createResource, createSignal } from "solid-js";
import { errorMessage, friends } from "../api/client";
import { notify } from "../state/notices";

/** Your friends, each with a button that invites them (`send`; they get a notification). */
export default function InviteFriends(props: { send: (username: string) => Promise<unknown> }) {
  const [list] = createResource(() => friends.list().catch(() => undefined));
  const [invited, setInvited] = createSignal<string[]>([]);

  async function invite(username: string) {
    try {
      await props.send(username);
      setInvited((names) => [...names, username]);
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <section class="flex w-full max-w-xl flex-col gap-2 text-left">
      <h2 class="text-sub">invite friends</h2>
      <Show when={(list()?.friends.length ?? 0) > 0} fallback={<p class="text-sub">{list.loading ? "loading…" : "no friends yet — share the link instead"}</p>}>
        <ul data-testid="invite-friends" class="flex max-h-64 flex-col gap-2 overflow-y-auto">
          <For each={list()?.friends}>
            {(friend) => (
              <li class="flex items-center justify-between gap-4">
                <span class="flex items-center gap-2 text-text">
                  <span class={`h-2 w-2 rounded-full ${friend.online ? "bg-main" : "bg-sub-alt"}`} aria-label={friend.online ? "online" : "offline"} />
                  {friend.username}
                </span>
                <Show when={!invited().includes(friend.username)} fallback={<span class="text-main">invited</span>}>
                  <button type="button" class="btn" onClick={() => void invite(friend.username)}>
                    invite
                  </button>
                </Show>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </section>
  );
}
