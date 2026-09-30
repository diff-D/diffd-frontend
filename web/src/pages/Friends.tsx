import { A } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { errorMessage, friends, users } from "../api/client";
import { currentUsername } from "../state/identity";
import { requestAnswered } from "../state/live";
import { notify } from "../state/notices";
import { formatDay, timeAgo } from "./format";
import { useTitle } from "../ui/title";
import PlayerName from "../ui/PlayerName";

const profileLink = (name: string) => `/u/${encodeURIComponent(name)}`;

/** Your friends, requests both ways, and a box to add someone by name. */
export default function Friends() {
  useTitle(() => "friends");
  const [list, { refetch }] = createResource(
    () => currentUsername(),
    () => friends.list(),
  );
  const [name, setName] = createSignal("");
  /** Usernames starting with what's typed, fetched once typing pauses. */
  const [suggestions, setSuggestions] = createSignal<string[]>([]);
  let pause: number | undefined;
  function typed(value: string) {
    setName(value);
    window.clearTimeout(pause);
    const q = value.trim();
    if (!q) return setSuggestions([]);
    pause = window.setTimeout(() => {
      users.search(q).then(
        (res) => setSuggestions(res.usernames.filter((u) => u !== currentUsername())),
        () => setSuggestions([]),
      );
    }, 150);
  }
  const [busy, setBusy] = createSignal(false);

  async function act(action: () => Promise<unknown>, done?: string) {
    setBusy(true);
    try {
      await action();
      if (done) notify(done);
      await refetch();
    } catch (err) {
      notify(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function add(e: SubmitEvent) {
    e.preventDefault();
    const username = name().trim();
    if (!username) return;
    await act(async () => {
      const res = await friends.request(username);
      notify(res.status === "accepted" ? `you and ${username} are friends` : `request sent to ${username}`);
      setName("");
    });
  }

  return (
    <div class="flex flex-col gap-8 pt-4">
      <h1 class="text-[2rem] text-text">friends</h1>
      <Show
        when={currentUsername()}
        fallback={
          <p class="text-sub">
            <A href="/login" class="text-main">
              Sign in
            </A>{" "}
            to add friends and challenge them.
          </p>
        }
      >
        <form class="flex max-w-xl gap-2" onSubmit={add}>
          <input
            class="field min-w-0 grow"
            aria-label="friend's username"
            placeholder="username"
            list="username-suggestions"
            autocomplete="off"
            value={name()}
            onInput={(e) => typed(e.currentTarget.value)}
          />
          <datalist id="username-suggestions" data-testid="username-suggestions">
            <For each={suggestions()}>{(username) => <option value={username} />}</For>
          </datalist>
          <button type="submit" class="btn shrink-0" disabled={busy()}>
            add friend
          </button>
        </form>

        <Show when={(list()?.incoming.length ?? 0) > 0}>
          <section class="flex flex-col gap-2">
            <h2 class="text-sub">requests</h2>
            <ul data-testid="incoming" class="flex flex-col gap-2">
              <For each={list()?.incoming}>
                {(request) => (
                  <li class="flex items-center gap-4">
                    <A href={profileLink(request.username)} class="text-text hover:text-main">
                      {request.username}
                    </A>
                    <span class="text-sm text-sub">{timeAgo(request.sent_at)}</span>
                    <button type="button" class="btn" disabled={busy()} onClick={() => {
                        requestAnswered(request.id);
                        void act(() => friends.accept(request.id), `you and ${request.username} are friends`);
                      }}>
                      accept
                    </button>
                    <button
                      type="button"
                      class="btn-text"
                      disabled={busy()}
                      onClick={() => {
                        requestAnswered(request.id);
                        void act(() => friends.decline(request.id));
                      }}
                    >
                      decline
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>

        <section class="flex flex-col gap-2">
          <h2 class="text-sub">
            friends <span class="text-sm">{list() ? `${list()!.friends.length + list()!.outgoing.length}/${list()!.max}` : ""}</span>
          </h2>
          <Show when={(list()?.friends.length ?? 0) > 0} fallback={<p class="text-sub">{list.loading ? "loading…" : "no friends yet: add someone by their username, or from their profile"}</p>}>
            <ul data-testid="friends" class="flex flex-col gap-2">
              <For each={list()?.friends}>
                {(friend) => (
                  <li class="flex items-center gap-4">
                    <span
                      class={`h-2 w-2 shrink-0 rounded-full ${friend.online ? "bg-main" : "bg-sub-alt"}`}
                      title={friend.online ? "online" : "offline"}
                      aria-label={friend.online ? "online" : "offline"}
                    />
                    <A href={profileLink(friend.username)} class="text-text hover:text-main">
                      <PlayerName name={friend.username} tag={friend.org_tag} />
                    </A>
                    <span class="text-sm text-sub">since {formatDay(friend.since)}</span>
                    <button
                      type="button"
                      class="btn-text"
                      disabled={busy()}
                      onClick={() => confirm(`unfriend ${friend.username}?`) && void act(() => friends.remove(friend.username))}
                    >
                      unfriend
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </section>

        <Show when={(list()?.outgoing.length ?? 0) > 0}>
          <section class="flex flex-col gap-2">
            <h2 class="text-sub">sent</h2>
            <ul data-testid="outgoing" class="flex flex-col gap-2">
              <For each={list()?.outgoing}>
                {(request) => (
                  <li class="flex items-center gap-4">
                    <A href={profileLink(request.username)} class="text-text hover:text-main">
                      {request.username}
                    </A>
                    <button type="button" class="btn-text" disabled={busy()} onClick={() => void act(() => friends.decline(request.id))}>
                      cancel
                    </button>
                  </li>
                )}
              </For>
            </ul>
          </section>
        </Show>
      </Show>
    </div>
  );
}
