import { A } from "@solidjs/router";
import { Show, createResource, createSignal } from "solid-js";
import { errorMessage, profile } from "../api/client";
import AboutEditor from "../profile/AboutEditor";
import AboutView from "../profile/AboutView";
import MeLinks from "../profile/MeLinks";
import ProfileView from "../profile/ProfileView";
import { currentUsername } from "../state/identity";
import { notify } from "../state/notices";
import PlayerName from "../ui/PlayerName";
import { useTitle } from "../ui/title";
import { timeAgo } from "./format";

/** Your own profile (a guest's too): the summary, with your practice. */
export default function Profile() {
  useTitle(() => "profile");
  const [summary] = createResource(() => profile.summary().catch((err: unknown) => (notify(errorMessage(err)), undefined)));
  // an account's bio and organisations (guests have none)
  const [about, { mutate: setAbout }] = createResource(currentUsername, () => profile.about().catch(() => undefined));
  const [editing, setEditing] = createSignal(false);
  return (
    <div class="flex flex-col gap-8 pt-4">
      <div class="flex flex-wrap items-baseline gap-x-4">
        <h1 data-testid="profile-name" class="text-[2rem] break-all text-text">
          <PlayerName name={currentUsername() ?? "guest"} tag={about()?.display} />
        </h1>
        <Show when={currentUsername()}>
          {(name) => (
            <A href={`/u/${encodeURIComponent(name())}`} class="btn-text">
              public profile
            </A>
          )}
        </Show>
        <Show when={summary()?.totals.last_active}>
          {(at) => <span data-testid="last-active" class="text-sub">last active {timeAgo(at())}</span>}
        </Show>
      </div>
      <MeLinks />
      <Show when={currentUsername() ? about() : undefined}>
        {(a) => (
          <Show
            when={editing()}
            fallback={
              <div class="flex flex-col gap-3">
                <AboutView about={a()} />
                <button type="button" class="btn-text self-start text-sm" onClick={() => setEditing(true)}>
                  <i class="fa-solid fa-pen" /> edit profile
                </button>
              </div>
            }
          >
            <AboutEditor about={a()} saved={setAbout} onClose={() => setEditing(false)} />
          </Show>
        )}
      </Show>
      <Show when={!currentUsername()}>
        <p class="text-sub">
          Runs you play as a guest stay with this browser.{" "}
          <A href="/register" class="text-main">
            Sign up
          </A>{" "}
          to save future runs to an account.
        </p>
      </Show>
      <Show when={summary()} fallback={<p class="text-sub">{summary.loading ? "loading…" : ""}</p>}>
        {(s) => (
          <Show
            when={s().totals.runs + s().totals.wins + s().totals.losses + s().totals.draws > 0}
            fallback={
              <p class="text-sub">
                no runs yet ·{" "}
                <A href="/" class="text-main hover:underline">
                  pick a game
                </A>
              </p>
            }
          >
            <ProfileView summary={s()} base="/profile" />
          </Show>
        )}
      </Show>
    </div>
  );
}
