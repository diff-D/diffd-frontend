import { A, useParams } from "@solidjs/router";
import { profile, users } from "../api/client";
import DuelHistory from "../profile/DuelHistory";
import RunsTable from "../profile/RunsTable";
import { useTitle } from "../ui/title";

/** Every run and 1v1 of a player (yours, or someone's ranked ones), a page at a time. */
export default function ProfileHistory() {
  const params = useParams<{ username?: string }>();
  const name = params.username;
  useTitle(() => (name ? `${name} · runs` : "your runs"));
  const back = name ? `/u/${encodeURIComponent(name)}` : "/profile";
  return (
    <div class="flex flex-col gap-8 pt-4">
      <A href={back} class="btn-text self-start">
        <i class="fa-solid fa-arrow-left" /> {name ?? "profile"}
      </A>
      <RunsTable load={(cursor) => (name ? users.history(name, cursor) : profile.history(cursor))} />
      <DuelHistory load={(cursor) => (name ? users.duels(name, cursor) : profile.duels(cursor))} />
    </div>
  );
}
