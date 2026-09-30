import { A } from "@solidjs/router";
import { For, Show, createEffect, createResource, createSignal, on } from "solid-js";
import Games from "../admin/Games";
import { admin, errorMessage } from "../api/client";
import Stat from "../ui/Stat";
import type { AdminUser, Role } from "../api/types";
import { testName } from "../profile/names";
import { isAdmin, isStaff } from "../state/identity";
import { notify } from "../state/notices";
import { formatDuration, formatScore, timeAgo } from "./format";
import { useTitle } from "../ui/title";

const ROLES: [Role, string][] = [
  ["user", "user"],
  ["moderator", "moderator"],
  ["admin", "admin"],
];

/**
 * Admins find users, then ban, kick, rename, promote or delete them, or delete single runs,
 * and see the site's and games' analytics. Moderators get the users part: find, ban, kick,
 * and let a new account create organisations; no analytics, emails or deleting.
 */
export default function Admin() {
  useTitle(() => (isAdmin() ? "admin" : "moderation"));
  const [tab, setTab] = createSignal<"users" | "games">("users");
  const [query, setQuery] = createSignal("");
  const [users, setUsers] = createSignal<AdminUser[]>([]);
  const [cursor, setCursor] = createSignal<string | null>(null);
  const [selected, setSelected] = createSignal<string>();
  const [detail, { refetch }] = createResource(selected, (id) => admin.user(id));
  const [overview] = createResource(isAdmin, (yes) => (yes ? admin.overview() : undefined));

  async function search(from?: string) {
    try {
      const page = await admin.users(query().trim(), from);
      setUsers((list) => (from ? [...list, ...page.users] : page.users));
      setCursor(page.next_cursor);
    } catch (err) {
      notify(errorMessage(err));
    }
  }
  // the identity may arrive after the page
  createEffect(
    on(isStaff, (yes) => {
      if (yes) void search();
    }),
  );

  /** Runs an action on the selected user, then refreshes what is shown. */
  async function act(action: () => Promise<unknown>, done: string) {
    try {
      await action();
      notify(done);
      await Promise.all([search(), selected() ? refetch() : undefined]);
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  function rename(user: AdminUser) {
    const username = prompt(`new name for ${user.username}`, user.username)?.trim();
    if (username && username !== user.username) void act(() => admin.update(user.id, { username }), `renamed to ${username}`);
  }

  function ban(user: AdminUser) {
    const reason = prompt(`ban ${user.username}? reason (optional)`);
    if (reason !== null) void act(() => admin.ban(user.id, reason || undefined), `${user.username} banned`);
  }

  function remove(user: AdminUser) {
    if (prompt(`type ${user.username} to delete the account and all its runs`) !== user.username) return;
    setSelected(undefined);
    void act(() => admin.remove(user.id), `${user.username} deleted`);
  }

  return (
    <div class="flex flex-col gap-8 pt-4">
      <h1 class="text-[2rem] text-text">{isAdmin() ? "admin" : "moderation"}</h1>
      <Show when={isStaff()} fallback={<p class="text-sub">admins and moderators only</p>}>
        <Show when={overview()}>
          {(o) => (
            <div data-testid="admin-overview" class="flex flex-wrap gap-12">
              <Stat label="users" value={o().users} />
              <Stat label="banned" value={o().banned} />
              <Stat label="runs today" value={o().runs_today} />
              <Stat label="runs" value={o().runs} />
              <Stat label="online now" value={o().online} />
              <Stat label="parties now" value={o().parties} />
            </div>
          )}
        </Show>
        <Show when={isAdmin()}>
        <div role="group" aria-label="section" class="flex self-start rounded-full bg-sub-alt p-1 text-sm">
          <For each={["users", "games"] as const}>
            {(id) => (
              <button type="button" class={`pill ${tab() === id ? "active" : ""}`} aria-pressed={tab() === id} onClick={() => setTab(id)}>
                {id}
              </button>
            )}
          </For>
        </div>
        </Show>
        <Show when={isAdmin() && tab() === "games"}>
          <Games />
        </Show>
        <Show when={tab() === "users"}>
        <form
          class="flex max-w-xl gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void search();
          }}
        >
          <input class="field grow" aria-label="search users" placeholder="username" value={query()} onInput={(e) => setQuery(e.currentTarget.value)} />
          <button type="submit" class="btn">
            search
          </button>
        </form>

        <table data-testid="admin-users" class="block w-full overflow-x-auto text-left text-sm whitespace-nowrap sm:table sm:text-base">
          <thead class="text-sm text-sub">
            <tr>
              <th class="py-1 font-normal">user</th>
              <th class="py-1 font-normal">role</th>
              <th class="py-1 font-normal">runs</th>
              <th class="py-1 font-normal">joined</th>
              <th class="py-1 font-normal">last seen</th>
            </tr>
          </thead>
          <tbody>
            <For each={users()}>
              {(user) => (
                <tr class={`cursor-pointer text-text hover:bg-sub-alt ${selected() === user.id ? "bg-sub-alt" : ""}`} onClick={() => setSelected(user.id)}>
                  <td class="py-1">
                    {user.username}
                    <Show when={user.banned_at}>
                      <span class="ml-2 text-error">banned</span>
                    </Show>
                  </td>
                  <td class={`py-1 ${user.role === "admin" ? "text-main" : user.role === "moderator" ? "text-text" : "text-sub"}`}>{user.role}</td>
                  <td class="py-1">{user.runs}</td>
                  <td class="py-1 text-sub">{timeAgo(user.created_at)}</td>
                  <td class="py-1 text-sub">{user.last_seen_at ? timeAgo(user.last_seen_at) : "–"}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
        <Show when={cursor()}>
          {(next) => (
            <div>
              <button type="button" class="btn" onClick={() => void search(next())}>
                load more
              </button>
            </div>
          )}
        </Show>

        <Show when={detail()} keyed>
          {(d) => (
            <section data-testid="admin-detail" class="flex flex-col gap-4 rounded-lg bg-sub-alt p-6">
              <div class="flex flex-wrap items-baseline gap-4">
                <h2 class="text-[1.5rem] text-text">{d.user.username}</h2>
                <A href={`/u/${encodeURIComponent(d.user.username)}`} class="btn-text">
                  public profile
                </A>
                <Show when={isAdmin()}>
                  <span class="text-sub">{d.user.email ?? "no email"}</span>
                </Show>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                {/* moderators act on players only */}
                <Show when={isAdmin() || d.user.role === "user"}>
                <Show
                  when={d.user.banned_at}
                  fallback={
                    <button type="button" class="btn" onClick={() => ban(d.user)}>
                      ban
                    </button>
                  }
                >
                  <button type="button" class="btn" onClick={() => void act(() => admin.unban(d.user.id), `${d.user.username} unbanned`)}>
                    unban
                  </button>
                </Show>
                <button
                  type="button"
                  class="btn"
                  title="sign them out everywhere (they can sign in again)"
                  onClick={() => confirm(`sign ${d.user.username} out everywhere?`) && void act(() => admin.kick(d.user.id), `${d.user.username} signed out`)}
                >
                  kick
                </button>
                </Show>
                <label class="flex items-center gap-2 px-2 text-sm text-text" title="accounts can create organisations once they're 30 days old">
                  <input
                    type="checkbox"
                    checked={d.user.orgs_allowed}
                    onChange={(e) => {
                      const allowed = e.currentTarget.checked;
                      void act(() => admin.allowOrgs(d.user.id, allowed), allowed ? `${d.user.username} can create organisations` : `${d.user.username} waits for 30 days`);
                    }}
                  />
                  may create organisations now
                </label>
                <Show when={isAdmin()}>
                <button type="button" class="btn" onClick={() => rename(d.user)}>
                  rename
                </button>
                <select
                  class="field"
                  aria-label="role"
                  value={d.user.role}
                  onChange={(e) => {
                    const role = e.currentTarget.value as Role;
                    void act(() => admin.update(d.user.id, { role }), `${d.user.username} is now ${role === "admin" ? "an admin" : `a ${role}`}`);
                  }}
                >
                  <For each={ROLES}>{([id, label]) => <option value={id}>{label}</option>}</For>
                </select>
                <button type="button" class="btn !text-error" onClick={() => remove(d.user)}>
                  delete account
                </button>
                </Show>
              </div>

              <Show when={d.games}>
                {(games) => (
                  <>
              <h3 class="text-sub">games</h3>
              <Show when={games().length > 0} fallback={<p class="text-sub">no games played</p>}>
                <table data-testid="admin-user-games" class="block w-full overflow-x-auto text-left text-sm whitespace-nowrap sm:table">
                  <thead class="text-sub">
                    <tr>
                      <th class="py-1 font-normal">game</th>
                      <th class="py-1 font-normal">runs</th>
                      <th class="py-1 font-normal">time</th>
                      <th class="py-1 font-normal">best</th>
                      <th class="py-1 font-normal">standing</th>
                      <th class="py-1 font-normal">1v1</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={games()}>
                      {(game) => (
                        <tr class="text-text">
                          <td class="py-1">{testName(game.test)}</td>
                          <td class="py-1">
                            {game.runs}
                            <Show when={game.practice_runs > 0}>
                              <span class="text-sub"> ({game.practice_runs} practice)</span>
                            </Show>
                          </td>
                          <td class="py-1 text-sub">{formatDuration(game.time_ms)}</td>
                          <td class="py-1 text-main">{game.best === null ? "–" : formatScore(game.test, game.best)}</td>
                          <td class="py-1">
                            <Show when={game.rank} fallback={<span class="text-sub">–</span>}>
                              {(rank) => (
                                <>
                                  #{rank()} <span class="text-sub">of {game.players}</span>
                                  <Show when={game.players >= 10}>
                                    <span class="text-sub"> · top {Math.max(1, Math.round((rank() / game.players) * 100))}%</span>
                                  </Show>
                                </>
                              )}
                            </Show>
                          </td>
                          <td class="py-1 text-sub">
                            {game.wins + game.losses + game.draws === 0 ? "–" : `${game.wins}·${game.losses}·${game.draws}`}
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </Show>

                  </>
                )}
              </Show>

              <h3 class="text-sub">latest runs</h3>
              <Show when={d.runs.length > 0} fallback={<p class="text-sub">no runs</p>}>
                <ul data-testid="admin-runs" class="flex flex-col gap-1">
                  <For each={d.runs}>
                    {(run) => (
                      <li class="flex items-center gap-4 text-text">
                        <span>
                          {testName(run.test)} · {run.settings_key} · <span class="text-main">{formatScore(run.test, run.primary_score)}</span>
                        </span>
                        <span class="text-sm text-sub">{timeAgo(run.finished_at)}</span>
                        <Show when={isAdmin()}>
                        <button
                          type="button"
                          class="btn-text"
                          onClick={() => confirm("delete this run (and any 1v1 it was part of)?") && void act(() => admin.removeRun(run.id), "run deleted")}
                        >
                          delete
                        </button>
                        </Show>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>

              <h3 class="text-sub">admin log</h3>
              <Show when={d.actions.length > 0} fallback={<p class="text-sub">nothing yet</p>}>
                <ul data-testid="admin-log" class="flex flex-col gap-1 text-sm">
                  <For each={d.actions}>
                    {(action) => (
                      <li class="text-text">
                        <span class="text-sub">{timeAgo(action.created_at)}</span> {action.admin}: {action.action.replace("_", " ")}{" "}
                        <span class="text-sub">{Object.values(action.detail).filter(Boolean).join(" → ")}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </Show>
            </section>
          )}
        </Show>
        </Show>
      </Show>
    </div>
  );
}
