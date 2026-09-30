import { A } from "@solidjs/router";
import { For, Show, createSignal } from "solid-js";
import { errorMessage, profile } from "../api/client";
import type { About } from "../api/types";
import { notify } from "../state/notices";

const BIO_WORDS = 250;
const words = (text: string) => text.split(/\s+/).filter(Boolean).length;

/** Your bio, and which of your organisations' tags shows before your name. */
export default function AboutEditor(props: { about: About; saved: (about: About) => void; onClose: () => void }) {
  const [bio, setBio] = createSignal(props.about.bio ?? "");
  const [display, setDisplay] = createSignal(props.about.display ?? "");
  const [saving, setSaving] = createSignal(false);
  const members = () => props.about.organisations.filter((org) => org.status === "member");
  const pending = () => props.about.organisations.filter((org) => org.status === "pending");
  const tooLong = () => words(bio()) > BIO_WORDS;

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (tooLong()) return;
    setSaving(true);
    try {
      props.saved(await profile.setAbout({ bio: bio().trim() || null, display: display() || null }));
      notify("profile saved");
      props.onClose();
    } catch (err) {
      notify(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form data-testid="about-editor" class="flex max-w-2xl flex-col gap-4 rounded-lg bg-sub-alt/50 p-4" onSubmit={save}>
      <label class="flex flex-col gap-1 text-sm text-sub">
        bio
        <textarea
          class="field min-h-28 resize-y text-base"
          aria-label="bio"
          value={bio()}
          onInput={(e) => setBio(e.currentTarget.value)}
        />
        <span class={`self-end text-xs ${tooLong() ? "text-error" : ""}`}>
          {words(bio())}/{BIO_WORDS} words
        </span>
      </label>
      <label class="flex flex-col gap-1 text-sm text-sub">
        tag before your name
        <select class="field text-base" aria-label="tag before your name" value={display()} onChange={(e) => setDisplay(e.currentTarget.value)}>
          <option value="">none</option>
          <For each={members()}>{(org) => <option value={org.tag}>{`${org.tag} · ${org.name}`}</option>}</For>
        </select>
      </label>
      <Show when={pending().length > 0}>
        <p class="text-xs text-sub">waiting to be let into {pending().map((org) => org.tag).join(", ")}</p>
      </Show>
      <div class="flex flex-wrap items-center gap-4">
        <button type="submit" class="btn primary" disabled={saving() || tooLong()}>
          save
        </button>
        <button type="button" class="btn-text" onClick={() => props.onClose()}>
          cancel
        </button>
        <A href="/orgs" class="btn-text ml-auto text-sm">
          <i class="fa-solid fa-building" /> find or create an organisation
        </A>
      </div>
    </form>
  );
}
