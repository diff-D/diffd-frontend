import { A, useNavigate, useParams } from "@solidjs/router";
import { For, Show, createResource, createSignal } from "solid-js";
import { ApiError, errorMessage, organisations, profile } from "../api/client";
import type { OrgKind, Organisation } from "../api/types";
import { ORG_KINDS, orgKindLabel } from "../profile/orgKinds";
import { currentUsername } from "../state/identity";
import { notify } from "../state/notices";
import NotFound from "./NotFound";
import { formatDay } from "./format";
import { useTitle } from "../ui/title";

/** The owner's (or an admin's) controls: what it is, who joins, who's in. */
function Manage(props: { org: Organisation; changed: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = createSignal(props.org.name);
  const [kind, setKind] = createSignal<OrgKind>(props.org.kind);
  const [open, setOpen] = createSignal(props.org.open);
  const [aliases, setAliases] = createSignal(props.org.aliases.join(", "));
  const act = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      notify(done);
      props.changed();
    } catch (err) {
      notify(errorMessage(err));
    }
  };
  return (
    <section data-testid="org-manage" class="flex flex-col gap-4 rounded-lg bg-sub-alt/50 p-4">
      <h2 class="text-sub">manage</h2>
      <Show when={(props.org.pending ?? []).length > 0}>
        <div class="flex flex-col gap-2">
          <h3 class="text-sm text-sub">asking to join</h3>
          <ul data-testid="org-pending" class="flex flex-col gap-1">
            <For each={props.org.pending}>
              {(p) => (
                <li class="flex items-center gap-3">
                  <A href={`/u/${encodeURIComponent(p.username)}`} class="grow text-text hover:text-main">
                    {p.username}
                  </A>
                  <button type="button" class="btn" onClick={() => void act(() => organisations.accept(props.org.tag, p.username), `${p.username} is in`)}>
                    let in
                  </button>
                  <button type="button" class="btn-text" onClick={() => void act(() => organisations.removeMember(props.org.tag, p.username), "request turned down")}>
                    turn down
                  </button>
                </li>
              )}
            </For>
          </ul>
        </div>
      </Show>
      <form
        class="flex flex-col gap-3 text-sm"
        onSubmit={(e) => {
          e.preventDefault();
          const list = aliases().split(",").map((a) => a.trim()).filter(Boolean);
          void act(() => organisations.update(props.org.tag, { name: name().trim(), kind: kind(), open: open(), aliases: list }), "saved");
        }}
      >
        <div class="flex flex-wrap gap-3">
          <label class="flex grow flex-col gap-1 text-sub">
            name
            <input class="field" aria-label="name" maxLength={50} value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          </label>
          <label class="flex flex-col gap-1 text-sub">
            kind
            <select class="field" aria-label="kind" value={kind()} onChange={(e) => setKind(e.currentTarget.value as OrgKind)}>
              <For each={ORG_KINDS}>{([id, label]) => <option value={id}>{label}</option>}</For>
            </select>
          </label>
        </div>
        <label class="flex flex-col gap-1 text-sub">
          other names, comma-separated
          <input class="field" aria-label="other names" value={aliases()} onInput={(e) => setAliases(e.currentTarget.value)} />
        </label>
        <label class="flex items-center gap-2 text-text">
          <input type="checkbox" checked={open()} onChange={(e) => setOpen(e.currentTarget.checked)} />
          anyone can join <span class="text-sub">(opening it lets in everyone who asked)</span>
        </label>
        <div class="flex items-center gap-4">
          <button type="submit" class="btn primary">
            save
          </button>
          <button
            type="button"
            class="btn-text ml-auto !text-error"
            onClick={() => {
              if (!confirm(`delete ${props.org.tag}? its members lose its tag`)) return;
              organisations.remove(props.org.tag).then(
                () => navigate("/orgs"),
                (err: unknown) => notify(errorMessage(err)),
              );
            }}
          >
            delete
          </button>
        </div>
      </form>
    </section>
  );
}

/** An organisation: what it is, its members, joining it, and showing its tag. */
export default function Org() {
  const params = useParams<{ tag: string }>();
  useTitle(() => params.tag);
  const [org, { refetch }] = createResource(
    () => params.tag,
    (tag) => organisations.get(tag).catch((err: unknown) => (err instanceof ApiError && err.status === 404 ? null : Promise.reject(err))),
  );
  const act = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      notify(done);
      void refetch();
    } catch (err) {
      notify(errorMessage(err));
    }
  };
  /** Shows its tag before your name (keeping your bio). */
  async function wear(tag: string) {
    const about = await profile.about();
    await profile.setAbout({ bio: about.bio, display: tag });
  }

  return (
    <Show when={org() !== null} fallback={<NotFound />}>
      <Show when={org()} keyed fallback={<p class="pt-4 text-sub">loading…</p>}>
        {(o) => (
          <div class="flex flex-col gap-8 pt-4">
            <div class="flex flex-col gap-2">
              <A href="/orgs" class="btn-text self-start text-sm">
                <i class="fa-solid fa-arrow-left" /> organisations
              </A>
              <h1 class="flex flex-wrap items-baseline gap-x-4 text-[2rem]">
                <span data-testid="org-tag" class="text-main">
                  {o.tag}
                </span>
                <span class="text-text">{o.name}</span>
              </h1>
              <span class="text-sub">
                {orgKindLabel(o.kind)} · {o.open ? "anyone can join" : "invite only: its owner lets people in"} · since {formatDay(o.created_at)}
                <Show when={o.owner}>
                  {(owner) => (
                    <>
                      {" "}
                      · run by{" "}
                      <A href={`/u/${encodeURIComponent(owner())}`} class="text-text hover:text-main">
                        {owner()}
                      </A>
                    </>
                  )}
                </Show>
              </span>
              <Show when={o.aliases.length > 0}>
                <span data-testid="org-aliases" class="text-sm text-sub">
                  also {o.aliases.join(", ")}
                </span>
              </Show>
            </div>

            <Show when={currentUsername()}>
              <div class="flex flex-wrap items-center gap-4">
                <Show when={!o.you}>
                  <button type="button" class="btn primary" onClick={() => void act(() => organisations.join(o.tag), o.open ? `you're in ${o.tag}` : "request sent")}>
                    {o.open ? "join" : "ask to join"}
                  </button>
                </Show>
                <Show when={o.you === "pending"}>
                  <span class="text-sub">you asked to join</span>
                  <button type="button" class="btn-text" onClick={() => void act(() => organisations.leave(o.tag), "request withdrawn")}>
                    withdraw
                  </button>
                </Show>
                <Show when={o.you === "member" || o.you === "owner"}>
                  <button type="button" class="btn" onClick={() => void act(() => wear(o.tag), `${o.tag} shows before your name`)}>
                    show {o.tag} before my name
                  </button>
                  <Show when={o.you === "member"}>
                    <button type="button" class="btn-text" onClick={() => confirm(`leave ${o.tag}?`) && void act(() => organisations.leave(o.tag), `you left ${o.tag}`)}>
                      leave
                    </button>
                  </Show>
                </Show>
              </div>
            </Show>

            <section class="flex flex-col gap-2">
              <h2 class="text-sub">members · {o.members}</h2>
              <ul data-testid="org-members" class="flex flex-wrap gap-2">
                <For each={o.members_list}>
                  {(m) => (
                    <li class="flex items-center gap-1 rounded-lg bg-sub-alt px-3 py-1">
                      <A href={`/u/${encodeURIComponent(m.username)}`} class="text-text hover:text-main">
                        {m.username}
                      </A>
                      <Show when={o.manage && m.username !== o.owner}>
                        <button
                          type="button"
                          class="btn-text !p-0 text-sm"
                          aria-label={`remove ${m.username}`}
                          onClick={() => confirm(`remove ${m.username} from ${o.tag}?`) && void act(() => organisations.removeMember(o.tag, m.username), `${m.username} removed`)}
                        >
                          <i class="fa-solid fa-xmark" />
                        </button>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </section>

            <Show when={o.manage}>
              <Manage org={o} changed={() => void refetch()} />
            </Show>
          </div>
        )}
      </Show>
    </Show>
  );
}
