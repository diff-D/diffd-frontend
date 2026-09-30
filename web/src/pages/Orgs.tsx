import { A, useNavigate } from "@solidjs/router";
import { For, Show, createResource, createSignal, onCleanup } from "solid-js";
import { errorMessage, organisations } from "../api/client";
import type { OrgKind } from "../api/types";
import { ORG_KINDS, orgKindLabel } from "../profile/orgKinds";
import { currentUsername } from "../state/identity";
import { notify } from "../state/notices";
import { useTitle } from "../ui/title";

/** Organisations: find one by its tag, name or another name it goes by, or create one. */
export default function Orgs() {
  useTitle(() => "organisations");
  const navigate = useNavigate();
  const [query, setQuery] = createSignal("");
  const [search, setSearch] = createSignal("");
  let wait: number | undefined;
  onCleanup(() => window.clearTimeout(wait));
  // (an object: a blank search still searches, for the biggest)
  const [found] = createResource(() => ({ q: search() }), ({ q }) => organisations.search(q));
  const typed = (value: string) => {
    setQuery(value);
    window.clearTimeout(wait);
    wait = window.setTimeout(() => setSearch(value.trim()), 200);
  };

  const [creating, setCreating] = createSignal(false);
  const [tag, setTag] = createSignal("");
  const [name, setName] = createSignal("");
  const [kind, setKind] = createSignal<OrgKind>("team");
  const [open, setOpen] = createSignal(false);
  const [aliases, setAliases] = createSignal("");
  async function create(e: SubmitEvent) {
    e.preventDefault();
    try {
      const org = await organisations.create({
        tag: tag().trim(),
        name: name().trim(),
        kind: kind(),
        open: open(),
        aliases: aliases().split(",").map((a) => a.trim()).filter(Boolean),
      });
      navigate(`/orgs/${encodeURIComponent(org.tag)}`);
    } catch (err) {
      notify(errorMessage(err));
    }
  }

  return (
    <div class="flex flex-col gap-8 pt-4">
      <div class="flex flex-wrap items-baseline justify-between gap-4">
        <h1 class="text-[2rem] text-text">organisations</h1>
        <Show when={currentUsername()}>
          <button type="button" class="btn-text" aria-expanded={creating()} onClick={() => setCreating(!creating())}>
            <i class="fa-solid fa-plus" /> create one
          </button>
        </Show>
      </div>

      <Show when={creating()}>
        <form data-testid="org-create" class="flex max-w-2xl flex-col gap-3 rounded-lg bg-sub-alt/50 p-4 text-sm" onSubmit={create}>
          <div class="flex flex-wrap gap-3">
            <label class="flex flex-col gap-1 text-sub">
              tag
              <input class="field w-28 uppercase" aria-label="tag" maxLength={6} placeholder="PRX" value={tag()} onInput={(e) => setTag(e.currentTarget.value)} />
            </label>
            <label class="flex grow flex-col gap-1 text-sub">
              name
              <input class="field" aria-label="name" maxLength={50} placeholder="Paper Rex" value={name()} onInput={(e) => setName(e.currentTarget.value)} />
            </label>
            <label class="flex flex-col gap-1 text-sub">
              kind
              <select class="field" aria-label="kind" value={kind()} onChange={(e) => setKind(e.currentTarget.value as OrgKind)}>
                <For each={ORG_KINDS}>{([id, label]) => <option value={id}>{label}</option>}</For>
              </select>
            </label>
          </div>
          <label class="flex flex-col gap-1 text-sub">
            other names it goes by, comma-separated (people find it by these too)
            <input class="field" aria-label="other names" placeholder="PaperRex, PRex" value={aliases()} onInput={(e) => setAliases(e.currentTarget.value)} />
          </label>
          <label class="flex items-center gap-2 text-text">
            <input type="checkbox" checked={open()} onChange={(e) => setOpen(e.currentTarget.checked)} />
            anyone can join <span class="text-sub">(otherwise you approve each request)</span>
          </label>
          <p class="text-xs text-sub">the tag is shown before its members' names and is unique; letters and digits, up to 6</p>
          <p class="text-xs text-sub">accounts can create organisations once they're 30 days old, or sooner if a moderator allows it</p>
          <button type="submit" class="btn primary self-start">
            create
          </button>
        </form>
      </Show>

      <input
        class="field max-w-xl"
        aria-label="find an organisation"
        placeholder="find by tag or name"
        value={query()}
        onInput={(e) => typed(e.currentTarget.value)}
      />
      <Show when={found()} fallback={<p class="text-sub">loading…</p>}>
        {(result) => (
          <Show when={result().organisations.length > 0} fallback={<p class="text-sub">no organisation matches</p>}>
            <ul data-testid="org-results" class="flex flex-col gap-2">
              <For each={result().organisations}>
                {(org) => (
                  <li>
                    <A href={`/orgs/${encodeURIComponent(org.tag)}`} class="card !flex-row flex-wrap items-baseline gap-x-4 gap-y-1">
                      <span class="w-16 text-[1.25rem] text-main">{org.tag}</span>
                      <span class="grow text-text">{org.name}</span>
                      <span class="text-sm text-sub">{orgKindLabel(org.kind)}</span>
                      <span class="text-sm text-sub">
                        {org.members === 1 ? "1 member" : `${org.members} members`} · {org.open ? "open" : "invite only"}
                      </span>
                    </A>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        )}
      </Show>
    </div>
  );
}
