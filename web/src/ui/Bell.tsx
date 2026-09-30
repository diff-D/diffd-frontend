import { A } from "@solidjs/router";
import { For, Show, createSignal, onCleanup, onMount } from "solid-js";
import { acceptChallenge, alerts, declineChallenge, joinParty } from "../state/live";

/** What waits for the user: challenges to answer and friend requests. */
export default function Bell() {
  const [open, setOpen] = createSignal(false);
  let root!: HTMLDivElement;
  const close = (e: MouseEvent) => {
    if (!root.contains(e.target as Node)) setOpen(false);
  };
  onMount(() => document.addEventListener("click", close));
  onCleanup(() => document.removeEventListener("click", close));

  return (
    <div ref={root} class="relative">
      <button
        type="button"
        class="btn-text relative !px-1.5 sm:!px-2"
        aria-label="notifications"
        title="notifications"
        aria-expanded={open()}
        onClick={() => setOpen((o) => !o)}
      >
        <i class="fa-solid fa-fw fa-bell" />
        <Show when={alerts().length > 0}>
          <span data-testid="bell-count" class="absolute -top-1 -right-1 min-w-4 rounded-full bg-main px-1 text-xs leading-4 text-bg">
            {alerts().length}
          </span>
        </Show>
      </button>
      <Show when={open()}>
        <div
          data-testid="bell-list"
          class="fixed inset-x-4 top-[calc(max(0.75rem,env(safe-area-inset-top))+3rem)] z-40 flex flex-col gap-3 rounded-lg bg-sub-alt p-4 shadow-xl sm:absolute sm:inset-x-auto sm:top-auto sm:right-0 sm:mt-2 sm:w-80"
        >
          <Show when={alerts().length > 0} fallback={<span class="text-sub">nothing new</span>}>
            <For each={alerts()}>
              {(alert) => (
                <div class="flex flex-col gap-1">
                  <span class="text-text">{alert.text}</span>
                  <div class="flex gap-4">
                    <Show
                      when={alert.kind === "challenge" ? alert.challenge : undefined}
                      fallback={
                        <Show
                          when={alert.kind === "party" ? alert.room : undefined}
                          fallback={
                            <A href="/friends" class="btn-text !text-main" onClick={() => setOpen(false)}>
                              view
                            </A>
                          }
                        >
                          {(room) => (
                            <button
                              type="button"
                              class="btn-text !text-main"
                              onClick={() => {
                                setOpen(false);
                                joinParty(alert.id, room());
                              }}
                            >
                              join
                            </button>
                          )}
                        </Show>
                      }
                    >
                      {(challenge) => (
                        <>
                          <button
                            type="button"
                            class="btn-text !text-main"
                            onClick={() => {
                              setOpen(false);
                              acceptChallenge(challenge());
                            }}
                          >
                            accept
                          </button>
                          <button type="button" class="btn-text" onClick={() => void declineChallenge(challenge())}>
                            decline
                          </button>
                        </>
                      )}
                    </Show>
                  </div>
                </div>
              )}
            </For>
          </Show>
        </div>
      </Show>
    </div>
  );
}
