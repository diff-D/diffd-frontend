import { useParams } from "@solidjs/router";
import { Show, createResource } from "solid-js";
import { ApiError, users } from "../api/client";
import ChallengeButton from "../profile/ChallengeButton";
import FriendButton from "../profile/FriendButton";
import AboutView from "../profile/AboutView";
import ProfileView from "../profile/ProfileView";
import { currentUsername } from "../state/identity";
import { formatDay, timeAgo } from "./format";
import NotFound from "./NotFound";
import PlayerName from "../ui/PlayerName";
import { useTitle } from "../ui/title";

/** Anyone's public profile: their ranked play at a glance. */
export default function UserProfile() {
  const params = useParams<{ username: string }>();
  useTitle(() => params.username);
  const [user, { refetch }] = createResource(
    () => params.username,
    (username) => users.get(username).catch((err: unknown) => (err instanceof ApiError && err.status === 404 ? null : Promise.reject(err))),
  );
  return (
    <Show when={user() !== null} fallback={<NotFound />}>
      <Show when={user()} keyed fallback={<p class="pt-4 text-sub">{user.error ? "couldn't load this profile" : "loading…"}</p>}>
        {(profile) => (
          <div class="flex flex-col gap-8 pt-4">
            <div class="flex flex-wrap items-end justify-between gap-4">
              <div class="flex flex-col">
                <h1 data-testid="profile-name" class="text-[2rem] text-text">
                  <PlayerName name={profile.username} tag={profile.about.display} />
                </h1>
                <span class="text-sub">
                  joined {formatDay(profile.joined_at)}
                  <Show when={profile.summary.totals.last_active}>
                    {(at) => <span data-testid="last-active"> · last active {timeAgo(at())}</span>}
                  </Show>
                </span>
              </div>
              <Show when={currentUsername()}>
                <div class="flex flex-wrap gap-4">
                  <FriendButton username={profile.username} relation={profile.relation} changed={() => void refetch()} />
                  <Show when={profile.relation?.status === "friends"}>
                    <ChallengeButton username={profile.username} />
                  </Show>
                </div>
              </Show>
            </div>
            <AboutView about={profile.about} />
            <Show
              when={profile.summary.totals.runs + profile.summary.totals.wins + profile.summary.totals.losses + profile.summary.totals.draws > 0}
              fallback={<p class="text-sub">no games played yet</p>}
            >
              <ProfileView summary={profile.summary} base={`/u/${encodeURIComponent(profile.username)}`} />
            </Show>
          </div>
        )}
      </Show>
    </Show>
  );
}
